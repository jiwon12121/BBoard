"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWorkspacePresence } from "./workspace-presence-context";

type ActivityEntry = {
  id: string;
  message: string;
  at: number;
};

type Member = {
  user_id: string;
  role: string;
  email?: string;
  name?: string;
};

function relativeTime(at: number) {
  const diffMs = Date.now() - at;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간`;
  return "어제";
}

const PRESENCE_COLORS = ["#676380", "#5f6b5c", "#8a6559", "#7c6a54", "#8a7548"];

function colorForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

export function ActivitySidebar({
  workspaceId,
  members,
}: {
  workspaceId: string;
  members: Member[] | undefined;
}) {
  const { onlineUsers } = useWorkspacePresence();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const router = useRouter();
  const presenceByUserId = new Map(onlineUsers.map((u) => [u.userId, u]));
  const sortedMembers = [...(members ?? [])].sort((a, b) => {
    const aOnline = presenceByUserId.has(a.user_id) ? 0 : 1;
    const bOnline = presenceByUserId.has(b.user_id) ? 0 : 1;
    return aOnline - bOnline;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`workspace-activity:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "documents",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const title = (payload.new as { title?: string }).title ?? "제목 없음";
          setActivity((prev) =>
            [
              { id: crypto.randomUUID(), message: `"${title}" 문서가 생성되었습니다`, at: Date.now() },
              ...prev,
            ].slice(0, 20),
          );
          // The sidebar's document list is server-rendered - a document
          // someone else just created won't show up there on its own.
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "documents",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const oldRow = payload.old as { title?: string; yjs_state?: string };
          const newRow = payload.new as { title?: string; yjs_state?: string };
          const title = newRow.title ?? "제목 없음";
          let message: string | null = null;
          let titleChanged = false;
          if (oldRow.title !== undefined && oldRow.title !== newRow.title) {
            message = `문서 제목이 "${title}"(으)로 변경되었습니다`;
            titleChanged = true;
          } else if (oldRow.yjs_state !== newRow.yjs_state) {
            message = `"${title}" 문서가 수정되었습니다`;
          }
          if (!message) return; // metadata-only change (e.g. column width) - not real activity
          setActivity((prev) =>
            [{ id: crypto.randomUUID(), message, at: Date.now() }, ...prev].slice(0, 20),
          );
          // Only the sidebar's displayed title goes stale on a rename - a
          // plain content edit doesn't need the whole page to refetch.
          if (titleChanged) router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workspace_members",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        async (payload) => {
          const newUserId = (payload.new as { user_id?: string }).user_id;
          if (!newUserId) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", newUserId)
            .maybeSingle();
          const name = profile?.name ?? profile?.email ?? "새 멤버";
          setActivity((prev) =>
            [
              { id: crypto.randomUUID(), message: `${name}님이 합류했습니다`, at: Date.now() },
              ...prev,
            ].slice(0, 20),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  return (
    <aside className="flex w-[300px] shrink-0 flex-col gap-6 overflow-y-auto border-l border-border-ink bg-sidebar p-4">
      <div className="flex flex-col gap-2">
        <span className="text-[0.65625rem] font-medium uppercase tracking-[0.16em] text-ink/40">
          지금 이 워크스페이스
        </span>
        <ul className="flex flex-col gap-3">
          {sortedMembers.map((member) => {
            const presence = presenceByUserId.get(member.user_id);
            const isOnline = presence !== undefined;
            const displayName = presence?.name ?? member.name ?? member.email ?? member.user_id;
            return (
              <li key={member.user_id} className="flex items-center gap-2">
                <span
                  className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: colorForUser(member.user_id) }}
                >
                  {displayName.slice(0, 1).toUpperCase()}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-sidebar ${
                      isOnline ? "bg-green-500" : "bg-border-ink"
                    }`}
                    title={isOnline ? "온라인" : "오프라인"}
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{displayName}</p>
                  <p className="truncate text-xs text-ink/40">
                    {isOnline
                      ? presence?.documentTitle
                        ? `${presence.documentTitle} 보는 중`
                        : "워크스페이스 둘러보는 중"
                      : "오프라인"}
                  </p>
                </div>
              </li>
            );
          })}
          {sortedMembers.length === 0 && (
            <p className="text-sm text-ink/40">멤버가 없습니다.</p>
          )}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[0.65625rem] font-medium uppercase tracking-[0.16em] text-ink/40">
          활동
        </span>
        <ul className="flex flex-col gap-2">
          {activity.map((entry) => (
            <li key={entry.id} className="flex gap-2 text-sm">
              <span className="w-10 shrink-0 text-xs text-ink/40">{relativeTime(entry.at)}</span>
              <span className="text-ink/70">{entry.message}</span>
            </li>
          ))}
          {activity.length === 0 && (
            <p className="text-sm text-ink/40">
              접속해 있는 동안의 활동이 여기에 표시됩니다.
            </p>
          )}
        </ul>
      </div>
    </aside>
  );
}
