"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Member = {
  user_id: string;
  role: string;
  email?: string;
  name?: string;
};

export function MemberModal({
  members,
  ownerId,
  isOwner,
  workspaceId,
  currentUserId,
  currentUserName,
  inviteUrl,
  inviteRole,
  removeMemberAction,
  createInviteAction,
}: {
  members: Member[] | undefined;
  ownerId: string;
  isOwner: boolean;
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  inviteUrl: string | null;
  inviteRole: string | undefined;
  removeMemberAction: (formData: FormData) => void;
  createInviteAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Tracks this user's presence in the workspace regardless of role, so
  // owners can see who else is around - not just members whose browser
  // happens to have the member list UI open.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`workspace-presence:${workspaceId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineUserIds(new Set(Object.keys(channel.presenceState())));
      })
      .on("presence", { event: "join" }, () => {
        // The member list itself (names/roles) comes from a server-rendered
        // prop, so a newly-joined member won't show up there on their own -
        // refresh to re-run the server fetch and pick them up.
        if (isOwner) router.refresh();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: currentUserName });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, currentUserId, currentUserName, isOwner, router]);

  if (!isOwner) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-ink/50 underline"
      >
        멤버
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-canvas p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">멤버</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-ink/50"
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
                  <span className="flex items-center gap-2 text-ink">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        onlineUserIds.has(member.user_id)
                          ? "bg-green-500"
                          : "bg-border-ink"
                      }`}
                      title={onlineUserIds.has(member.user_id) ? "온라인" : "오프라인"}
                    />
                    {member.name ?? member.email ?? member.user_id}{" "}
                    <span className="text-ink/40">({member.role})</span>
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
                <p className="text-sm text-ink/40">멤버가 없습니다.</p>
              )}
            </ul>

            <div className="flex flex-col gap-2 border-t border-border-ink pt-4">
              <h3 className="text-sm font-semibold text-ink">멤버 초대</h3>
              {inviteUrl && (
                <div className="flex flex-col gap-1 rounded-md bg-sidebar p-2">
                  <span className="text-xs text-ink/50">
                    {inviteRole} 권한으로 참여
                  </span>
                  <p className="break-all text-xs text-ink">
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
                  className="rounded-md border border-border-ink bg-canvas px-2 py-1 text-sm text-ink"
                >
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-ink px-3 py-1 text-sm text-canvas"
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
