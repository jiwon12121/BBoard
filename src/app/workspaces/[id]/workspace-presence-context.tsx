"use client";

import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type PresenceUser = {
  userId: string;
  name: string;
  documentId?: string;
  documentTitle?: string;
};

type WorkspacePresenceValue = {
  onlineUsers: PresenceUser[];
  setCurrentDocument: (doc: { id: string; title: string } | null) => void;
};

const WorkspacePresenceContext = createContext<WorkspacePresenceValue | null>(
  null,
);

// A single presence channel per workspace, shared by everything that needs
// to read or write it (member list online dots, the activity sidebar, and
// the document editor reporting which doc the user is currently on) - so
// they can't race each other overwriting the same presence key.
export function WorkspacePresenceProvider({
  workspaceId,
  userId,
  userName,
  isOwner,
  children,
}: {
  workspaceId: string;
  userId: string;
  userName: string;
  isOwner: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentDocRef = useRef<{ id: string; title: string } | null>(null);

  // Reconnects the whole presence channel whenever the display name changes
  // (e.g. after editing the profile) rather than trying to re-track in
  // place without a reconnect - simpler and more reliably correct, at the
  // cost of a brief moment where the tracked current-document info is
  // reset (restored below from currentDocRef as soon as the new connection
  // subscribes, so it's barely noticeable).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`workspace-presence:${workspaceId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          name: string;
          documentId?: string;
          documentTitle?: string;
        }>();
        const list = Object.entries(state).map(([key, presences]) => {
          // A hard refresh briefly leaves the old (pre-refresh) connection
          // tracked under the same key alongside the new one, until the old
          // one times out - presences[0] is whichever tracked first, which
          // during that overlap is the stale one, so a just-changed name
          // can flash back to the old value for a moment. The most
          // recently tracked entry (the end of the array) is the one to
          // trust.
          const latest = presences[presences.length - 1];
          return {
            userId: key,
            name: latest?.name ?? "익명",
            documentId: latest?.documentId,
            documentTitle: latest?.documentTitle,
          };
        });
        setOnlineUsers(list);
      })
      .on("presence", { event: "join" }, () => {
        if (isOwner) router.refresh();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const doc = currentDocRef.current;
          await channel.track({
            name: userName,
            ...(doc ? { documentId: doc.id, documentTitle: doc.title } : {}),
          });
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [workspaceId, userId, userName, isOwner, router]);

  const setCurrentDocument = useCallback(
    (doc: { id: string; title: string } | null) => {
      currentDocRef.current = doc;
      channelRef.current?.track({
        name: userName,
        ...(doc ? { documentId: doc.id, documentTitle: doc.title } : {}),
      });
    },
    [userName],
  );

  return (
    <WorkspacePresenceContext.Provider
      value={{ onlineUsers, setCurrentDocument }}
    >
      {children}
    </WorkspacePresenceContext.Provider>
  );
}

export function useWorkspacePresence() {
  const ctx = useContext(WorkspacePresenceContext);
  if (!ctx) {
    throw new Error(
      "useWorkspacePresence must be used within WorkspacePresenceProvider",
    );
  }
  return ctx;
}
