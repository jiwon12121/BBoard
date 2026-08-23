"use client";

import { createClient } from "@/lib/supabase/client";
import Collaboration from "@tiptap/extension-collaboration";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMemo, useState } from "react";
import * as Y from "yjs";

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function DocumentEditor({
  documentId,
  title,
  initialState,
}: {
  documentId: string;
  title: string;
  initialState: string | null;
}) {
  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    if (initialState) {
      Y.applyUpdate(doc, base64ToUint8Array(initialState));
    }
    return doc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc }),
    ],
  });

  const handleSave = async () => {
    if (!editor) return;
    setStatus("saving");
    const state = uint8ArrayToBase64(Y.encodeStateAsUpdate(ydoc));
    const supabase = createClient();
    await supabase
      .from("documents")
      .update({ yjs_state: state })
      .eq("id", documentId);
    setStatus("saved");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <button
          onClick={handleSave}
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          {status === "saving" ? "저장 중..." : "저장"}
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="min-h-[400px] rounded-md border border-zinc-300 p-4"
      />
    </div>
  );
}
