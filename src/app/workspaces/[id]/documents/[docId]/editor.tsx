"use client";

import { createClient } from "@/lib/supabase/client";
import Collaboration from "@tiptap/extension-collaboration";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import useYProvider from "y-partyserver/react";

export function DocumentEditor({
  documentId,
  title,
}: {
  documentId: string;
  title: string;
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
