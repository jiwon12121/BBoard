"use client";

import { type Editor } from "@tiptap/react";
import type { ReactNode } from "react";

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded px-2 py-1 text-sm font-medium ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-zinc-300 dark:bg-zinc-700" />;
}

export function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-zinc-300 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
      <ToolbarButton
        label="굵게"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        label="기울임"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        label="취소선"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="제목 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        label="제목 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="제목 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        H3
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="글머리 목록"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        목록
      </ToolbarButton>
      <ToolbarButton
        label="번호 목록"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. 목록
      </ToolbarButton>
      <ToolbarButton
        label="인용"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        인용
      </ToolbarButton>
      <ToolbarButton
        label="코드 블록"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        {"</>"}
      </ToolbarButton>
    </div>
  );
}
