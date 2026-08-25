"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function DocumentLink({
  href,
  title,
  docId,
  isFavorite,
  canEdit,
  isOwner,
  renameAction,
  toggleFavoriteAction,
  deleteAction,
}: {
  href: string;
  title: string;
  docId: string;
  isFavorite: boolean;
  canEdit: boolean;
  isOwner: boolean;
  renameAction: (formData: FormData) => void;
  toggleFavoriteAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);

  if (renaming) {
    return (
      <li className="px-2 py-1.5">
        <form
          action={renameAction}
          onSubmit={() => setRenaming(false)}
        >
          <input type="hidden" name="docId" value={docId} />
          <input
            name="title"
            defaultValue={title}
            autoFocus
            onBlur={(e) => e.currentTarget.form?.requestSubmit()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setRenaming(false);
            }}
            className="w-full rounded border border-border-ink bg-canvas px-1 py-0.5 text-sm text-ink focus:outline-none"
          />
        </form>
      </li>
    );
  }

  return (
    <li
      className={`group flex items-center justify-between rounded-md px-2 py-1.5 transition-colors ${
        isActive ? "bg-canvas shadow-sm" : "hover:bg-ink/5"
      }`}
    >
      <Link
        href={href}
        className={`flex flex-1 items-center gap-1 truncate text-sm ${
          isActive ? "font-semibold text-ink" : "text-ink/60 hover:text-ink"
        }`}
      >
        {isFavorite && <span className="shrink-0 text-xs">★</span>}
        <span className="truncate">{title}</span>
      </Link>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="더보기"
          className={`h-6 w-7 shrink-0 cursor-pointer items-center justify-center gap-0.5 rounded-md hover:bg-ink/10 ${
            menuOpen ? "flex bg-ink/10" : "hidden group-hover:flex"
          }`}
        >
          <span className="h-1 w-1 rounded-full bg-ink/60" />
          <span className="h-1 w-1 rounded-full bg-ink/60" />
          <span className="h-1 w-1 rounded-full bg-ink/60" />
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 cursor-pointer"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border border-border-ink bg-canvas p-1 shadow-lg">
              <form
                action={toggleFavoriteAction}
                onSubmit={() => setMenuOpen(false)}
              >
                <input type="hidden" name="docId" value={docId} />
                <button
                  type="submit"
                  className="block w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-sidebar"
                >
                  {isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
                </button>
              </form>
              {canEdit && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setRenaming(true);
                  }}
                  className="block w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-sidebar"
                >
                  이름 바꾸기
                </button>
              )}
              {isOwner && (
                <form
                  action={deleteAction}
                  onSubmit={(e) => {
                    if (!confirm("이 문서를 삭제할까요? 되돌릴 수 없습니다.")) {
                      e.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="docId" value={docId} />
                  <button
                    type="submit"
                    className="block w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm text-red-600 hover:bg-sidebar"
                  >
                    휴지통
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}
