"use client";

import { createClient } from "@/lib/supabase/client";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import useYProvider from "y-partyserver/react";

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
  userId,
  userName,
}: {
  documentId: string;
  title: string;
  userId: string;
  userName: string;
}) {
  const provider = useYProvider({
    host: process.env.NEXT_PUBLIC_SYNC_SERVER_URL ?? "localhost:8787",
    party: "document-sync",
    room: documentId,
    options: {
      params: async () => {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        return { token: session?.access_token ?? "" };
      },
    },
  });

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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">{title}</h1>
      <EditorContent
        editor={editor}
        className="min-h-[400px] rounded-md border border-zinc-300 p-4"
      />
    </div>
  );
}
