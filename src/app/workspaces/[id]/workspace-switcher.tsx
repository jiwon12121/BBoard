"use client";

import Link from "next/link";
import { useState } from "react";

type WorkspaceOption = { id: string; name: string };

export function WorkspaceSwitcher({
  currentName,
  currentId,
  workspaces,
}: {
  currentName: string;
  currentId: string;
  workspaces: WorkspaceOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 truncate text-left font-semibold"
      >
        <span className="truncate">{currentName}</span>
        <span className="text-xs text-zinc-400">▾</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/workspaces/${ws.id}`}
                onClick={() => setOpen(false)}
                className={`block truncate rounded px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  ws.id === currentId ? "font-semibold" : ""
                }`}
              >
                {ws.name}
              </Link>
            ))}
            <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
            <Link
              href="/workspaces/new"
              onClick={() => setOpen(false)}
              className="block rounded px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              + 새 워크스페이스
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
