"use client";

import { type Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { uploadDocumentImage } from "./upload-image";

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
      className={`rounded px-2 py-1 text-left text-sm font-medium ${
        active ? "bg-ink text-canvas" : "text-ink/70 hover:bg-sidebar"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="my-1 h-px w-full bg-border-ink" />;
}

export function Toolbar({
  editor,
  mediaWidth,
}: {
  editor: Editor | null;
  mediaWidth: number;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const run = (command: () => void) => () => {
    command();
    setOpen(false);
  };

  const handleImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;

    setUploading(true);
    try {
      const publicUrl = await uploadDocumentImage(file);
      if (!publicUrl) return;
      editor.chain().focus().setImage({ src: publicUrl, width: mediaWidth }).run();
    } finally {
      setUploading(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="서식"
        className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium text-ink/40 hover:bg-sidebar hover:text-ink/70"
      >
        Aa
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-1 flex w-36 flex-col gap-0.5 rounded-md border border-border-ink bg-canvas p-1 shadow-lg">
            <ToolbarButton
              label="굵게"
              active={editor.isActive("bold")}
              onClick={run(() => editor.chain().focus().toggleBold().run())}
            >
              <strong>굵게</strong>
            </ToolbarButton>
            <ToolbarButton
              label="기울임"
              active={editor.isActive("italic")}
              onClick={run(() => editor.chain().focus().toggleItalic().run())}
            >
              <em>기울임</em>
            </ToolbarButton>
            <ToolbarButton
              label="취소선"
              active={editor.isActive("strike")}
              onClick={run(() => editor.chain().focus().toggleStrike().run())}
            >
              <span className="line-through">취소선</span>
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              label="제목 1"
              active={editor.isActive("heading", { level: 1 })}
              onClick={run(() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run(),
              )}
            >
              제목 1
            </ToolbarButton>
            <ToolbarButton
              label="제목 2"
              active={editor.isActive("heading", { level: 2 })}
              onClick={run(() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run(),
              )}
            >
              제목 2
            </ToolbarButton>
            <ToolbarButton
              label="제목 3"
              active={editor.isActive("heading", { level: 3 })}
              onClick={run(() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run(),
              )}
            >
              제목 3
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              label="글머리 목록"
              active={editor.isActive("bulletList")}
              onClick={run(() =>
                editor.chain().focus().toggleBulletList().run(),
              )}
            >
              글머리 목록
            </ToolbarButton>
            <ToolbarButton
              label="번호 목록"
              active={editor.isActive("orderedList")}
              onClick={run(() =>
                editor.chain().focus().toggleOrderedList().run(),
              )}
            >
              번호 목록
            </ToolbarButton>
            <ToolbarButton
              label="체크박스"
              active={editor.isActive("taskList")}
              onClick={run(() => editor.chain().focus().toggleTaskList().run())}
            >
              체크박스
            </ToolbarButton>
            <ToolbarButton
              label="인용"
              active={editor.isActive("blockquote")}
              onClick={run(() =>
                editor.chain().focus().toggleBlockquote().run(),
              )}
            >
              인용
            </ToolbarButton>
            <ToolbarButton
              label="코드 블록"
              active={editor.isActive("codeBlock")}
              onClick={run(() =>
                editor.chain().focus().toggleCodeBlock().run(),
              )}
            >
              코드 블록
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              label="토글"
              active={editor.isActive("details")}
              onClick={run(() => editor.chain().focus().setDetails().run())}
            >
              토글
            </ToolbarButton>
            <ToolbarButton
              label="이미지"
              onClick={run(() => fileInputRef.current?.click())}
            >
              {uploading ? "업로드 중..." : "이미지"}
            </ToolbarButton>
            <ToolbarButton
              label="유튜브"
              onClick={run(() => {
                const url = window.prompt("유튜브 링크를 입력하세요");
                if (url) editor.chain().focus().setYoutubeVideo({ src: url, width: mediaWidth }).run();
              })}
            >
              유튜브
            </ToolbarButton>
            <ToolbarButton
              label="구분선"
              onClick={run(() => editor.chain().focus().setHorizontalRule().run())}
            >
              구분선
            </ToolbarButton>
            <ToolbarButton
              label="컬럼 나누기"
              onClick={run(() => editor.chain().focus().insertColumns().run())}
            >
              컬럼 나누기
            </ToolbarButton>
          </div>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />
    </div>
  );
}
