"use client";

import { useRef, useState } from "react";
import { uploadAvatar } from "./upload-avatar";

export function ProfileModal({
  open,
  onClose,
  userId,
  email,
  name,
  avatarUrl,
  updateNameAction,
  updateAvatarAction,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  updateNameAction: (formData: FormData) => Promise<void>;
  updateAvatarAction: (formData: FormData) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const initial = (name ?? email ?? "?").slice(0, 1).toUpperCase();

  const handleAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const publicUrl = await uploadAvatar(userId, file);
      if (!publicUrl) return;
      const formData = new FormData();
      formData.set("avatarUrl", publicUrl);
      await updateAvatarAction(formData);
    } finally {
      setUploading(false);
    }
  };

  const handleNameSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setNameStatus("saving");
    await updateNameAction(formData);
    setNameStatus("saved");
    setTimeout(() => setNameStatus("idle"), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-5 rounded-lg bg-canvas p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">프로필</h2>
          <button onClick={onClose} className="text-sm text-ink/50">
            닫기
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="프로필 사진 변경"
            className="group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-ink text-xl font-semibold text-canvas"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-ink/50 text-[0.65rem] text-canvas opacity-0 transition-opacity group-hover:opacity-100">
              {uploading ? "업로드 중..." : "사진 변경"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFile}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink/40">이메일</span>
          <p className="text-sm text-ink">{email ?? "-"}</p>
        </div>

        <form onSubmit={handleNameSubmit} className="flex flex-col gap-1">
          <label htmlFor="profile-name" className="text-xs text-ink/40">
            이름
          </label>
          <div className="flex items-center gap-2">
            <input
              id="profile-name"
              name="name"
              defaultValue={name ?? ""}
              placeholder="이름"
              className="flex-1 rounded-md border border-border-ink bg-canvas px-2 py-1 text-sm text-ink"
            />
            <button
              type="submit"
              disabled={nameStatus === "saving"}
              className="w-16 shrink-0 cursor-pointer rounded-md bg-ink px-3 py-1 text-sm text-canvas disabled:cursor-default disabled:opacity-60"
            >
              {nameStatus === "saving" ? "저장 중" : nameStatus === "saved" ? "저장됨" : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
