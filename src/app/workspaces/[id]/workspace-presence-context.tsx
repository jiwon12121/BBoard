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
        const list = Object.entries(state).map(([key, presences]) => ({
          userId: key,
          name: presences[0]?.name ?? "익명",
          documentId: presences[0]?.documentId,
          documentTitle: presences[0]?.documentTitle,
        }));
        setOnlineUsers(list);
      })
      .on("presence", { event: "join" }, () => {
        if (isOwner) router.refresh();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: userName });
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
