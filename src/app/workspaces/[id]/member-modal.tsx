"use client";

import { useState } from "react";

type Member = {
  user_id: string;
  role: string;
  email?: string;
  name?: string;
};

export function MemberModal({
  members,
  ownerId,
  inviteUrl,
  inviteRole,
  removeMemberAction,
  createInviteAction,
}: {
  members: Member[] | undefined;
  ownerId: string;
  inviteUrl: string | null;
  inviteRole: string | undefined;
  removeMemberAction: (formData: FormData) => void;
  createInviteAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-500 underline"
      >
        멤버
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-6 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">멤버</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-zinc-500"
              >
                닫기
              </button>
            </div>

            <ul className="flex flex-col gap-1">
              {members?.map((member) => (
                <li
                  key={member.user_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {member.name ?? member.email ?? member.user_id}{" "}
                    <span className="text-zinc-400">({member.role})</span>
                  </span>
                  {member.user_id !== ownerId && (
                    <form action={removeMemberAction}>
                      <input
                        type="hidden"
                        name="userId"
                        value={member.user_id}
                      />
                      <button
                        type="submit"
                        className="text-xs text-red-600 underline"
                      >
                        제거
                      </button>
                    </form>
                  )}
                </li>
              ))}
              {members?.length === 0 && (
                <p className="text-sm text-zinc-500">멤버가 없습니다.</p>
              )}
            </ul>

            <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <h3 className="text-sm font-semibold">멤버 초대</h3>
              {inviteUrl && (
                <div className="flex flex-col gap-1 rounded-md bg-zinc-100 p-2 dark:bg-zinc-800">
                  <span className="text-xs text-zinc-500">
                    {inviteRole} 권한으로 참여
                  </span>
                  <p className="break-all text-xs text-zinc-900 dark:text-zinc-100">
                    {inviteUrl}
                  </p>
                </div>
              )}
              <form
                action={createInviteAction}
                className="flex items-center gap-2"
              >
                <select
                  name="role"
                  defaultValue="editor"
                  className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-black px-3 py-1 text-sm text-white dark:bg-white dark:text-black"
                >
                  초대 링크 생성
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
