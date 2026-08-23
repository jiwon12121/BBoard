import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const { data: workspaceId, error } = await supabase.rpc("accept_invite", {
    invite_token: token,
  });

  if (error || !workspaceId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">
          초대 링크가 유효하지 않습니다.
        </p>
      </div>
    );
  }

  redirect(`/workspaces/${workspaceId}`);
}
