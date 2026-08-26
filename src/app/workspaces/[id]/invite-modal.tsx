"use client";

export function InviteModal({
  open,
  onClose,
  title = "멤버 초대",
  inviteUrl,
  inviteRole,
  createInviteAction,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  inviteUrl: string | null;
  inviteRole: string | undefined;
  createInviteAction: (formData: FormData) => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-canvas p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="text-sm text-ink/50">
            닫기
          </button>
        </div>

        {inviteUrl && (
          <div className="flex flex-col gap-1 rounded-md bg-sidebar p-2">
            <span className="text-xs text-ink/50">{inviteRole} 권한으로 참여</span>
            <p className="break-all text-xs text-ink">{inviteUrl}</p>
          </div>
        )}
        <form action={createInviteAction} className="flex items-center gap-2">
          <select
            name="role"
            defaultValue="editor"
            className="rounded-md border border-border-ink bg-canvas px-2 py-1 text-sm text-ink"
          >
            <option value="editor">editor</option>
            <option value="guest">guest</option>
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
  );
}
