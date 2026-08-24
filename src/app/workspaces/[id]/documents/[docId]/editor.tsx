"use client";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import useYProvider from "y-partyserver/react";
import { ResizableColumn } from "./resizable-column";
import { Toolbar } from "./toolbar";
import { TitleEditor } from "./title-editor";

const CURSOR_COLORS = [
  "#f783ac",
  "#f08c00",
  "#2f9e44",
  "#1971c2",
  "#7048e8",
  "#e8590c",
];

function colorForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export function DocumentEditor({
  documentId,
  title,
  width: initialWidth,
  userId,
  userName,
  accessToken,
  renameAction,
  updateWidthAction,
}: {
  documentId: string;
  title: string;
  width: number | null;
  userId: string;
  userName: string;
  accessToken: string;
  renameAction: (formData: FormData) => void;
  updateWidthAction: (width: number) => void;
}) {
  const provider = useYProvider({
    host: process.env.NEXT_PUBLIC_SYNC_SERVER_URL ?? "localhost:8787",
    party: "document-sync",
    room: documentId,
    options: {
      // Known server-side already — skip a client-side Supabase round trip
      // that would otherwise block the WebSocket from opening at all
      // (the provider awaits params() before connecting).
      params: { token: accessToken },
    },
  });

  const [synced, setSynced] = useState(false);

  useEffect(() => {
    setSynced(provider.synced);
    const handleSynced = (isSynced: boolean) => setSynced(isSynced);
    provider.on("synced", handleSynced);
    return () => {
      provider.off("synced", handleSynced);
    };
  }, [provider]);

  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    const handleCustomMessage = (message: string) => {
      try {
        const data = JSON.parse(message) as { type?: string; width?: number };
        if (data.type === "width-change" && typeof data.width === "number") {
          setWidth(data.width);
        }
      } catch {
        // ignore malformed messages
      }
    };
    provider.on("custom-message", handleCustomMessage);
    return () => {
      provider.off("custom-message", handleCustomMessage);
    };
  }, [provider]);

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    updateWidthAction(newWidth);
    provider.sendMessage(
      JSON.stringify({ type: "width-change", width: newWidth }),
    );
  };

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: provider.doc }),
        CollaborationCaret.configure({
          provider,
          user: { name: userName, color: colorForUser(userId) },
        }),
      ],
    },
    [provider],
  );

  return (
    <div className="p-8">
      <ResizableColumn width={width} onWidthChange={handleWidthChange}>
        <div className="flex flex-col gap-4">
          <TitleEditor title={title} renameAction={renameAction} />
          <div className="relative">
            <div className="absolute left-2 top-2 z-10">
              <Toolbar editor={editor} />
            </div>
            <EditorContent
              editor={editor}
              className="min-h-[400px] p-4 pt-12"
            />
            {!synced && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-950/80">
                <span className="text-sm text-zinc-500">불러오는 중...</span>
              </div>
            )}
          </div>
        </div>
      </ResizableColumn>
    </div>
  );
}
