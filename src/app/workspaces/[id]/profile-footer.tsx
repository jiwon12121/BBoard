"use client";

import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { ProfileModal } from "./profile-modal";

export function ProfileFooter({
  userId,
  email,
  name,
  avatarUrl,
  roleLabel,
  updateNameAction,
  updateAvatarAction,
}: {
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  roleLabel: string;
  updateNameAction: (formData: FormData) => Promise<void>;
  updateAvatarAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const displayName = name ?? email ?? "?";

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border-ink p-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-m-1 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md p-1 text-left hover:bg-ink/5"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-semibold text-canvas">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-ink">{displayName}</span>
          <span className="flex items-center gap-1 text-xs text-ink/40">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            {roleLabel} · 온라인
          </span>
        </div>
      </button>
      <LogoutButton />
      <ProfileModal
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        email={email}
        name={name}
        avatarUrl={avatarUrl}
        updateNameAction={updateNameAction}
        updateAvatarAction={updateAvatarAction}
      />
    </div>
  );
}
