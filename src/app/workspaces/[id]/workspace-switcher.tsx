"use client";

import Link from "next/link";
import { useState } from "react";
import { InviteModal } from "./invite-modal";

type WorkspaceOption = { id: string; name: string };

export function WorkspaceSwitcher({
  currentName,
  currentId,
  workspaces,
  memberCount,
  documentCount,
  isOwner,
  inviteUrl,
  inviteRole,
  createInviteAction,
}: {
  currentName: string;
  currentId: string;
  workspaces: WorkspaceOption[];
  memberCount: number;
  documentCount: number;
  isOwner: boolean;
  inviteUrl: string | null;
  inviteRole: string | undefined;
  createInviteAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-start gap-2 rounded-md bg-canvas p-2 text-left shadow-sm transition-colors hover:bg-ink/10"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink text-sm font-semibold text-canvas">
          {currentName.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate font-semibold text-ink">{currentName}</span>
            <span className="text-xs text-ink/40">▾</span>
          </div>
          <p className="truncate text-xs text-ink/40">
            멤버 {memberCount} · 문서 {documentCount}
          </p>
        </div>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-pointer"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-border-ink bg-canvas p-1 shadow-lg">
            {isOwner && (
              <>
                <button
                  onClick={() => {
                    setOpen(false);
                    setInviteOpen(true);
                  }}
                  className="block w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm text-ink/50 hover:bg-sidebar"
                >
                  멤버 초대
                </button>
                <div className="my-1 border-t border-border-ink" />
              </>
            )}
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/workspaces/${ws.id}`}
                onClick={() => setOpen(false)}
                className={`block cursor-pointer truncate rounded px-2 py-1.5 text-sm text-ink hover:bg-sidebar ${
                  ws.id === currentId ? "font-semibold" : ""
                }`}
              >
                {ws.name}
              </Link>
            ))}
            <div className="my-1 border-t border-border-ink" />
            <Link
              href="/workspaces/new"
              onClick={() => setOpen(false)}
              className="block cursor-pointer rounded px-2 py-1.5 text-sm text-ink/50 hover:bg-sidebar"
            >
              + 새 워크스페이스
            </Link>
          </div>
        </>
      )}
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        inviteUrl={inviteUrl}
        inviteRole={inviteRole}
        createInviteAction={createInviteAction}
      />
    </div>
  );
}
