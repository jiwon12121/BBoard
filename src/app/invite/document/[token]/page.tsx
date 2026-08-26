import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { redirect } from "next/navigation";

export default async function DocumentInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/document/${token}`)}`);
  }

  const { data: documentId, error } = await supabase.rpc("accept_document_invite", {
    invite_token: token,
  });

  if (error || !documentId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-ink/40">
          초대 링크가 유효하지 않습니다.
        </p>
      </div>
    );
  }

  const { data: document } = await supabase
    .from("documents")
    .select("workspace_id")
    .eq("id", documentId)
    .single();

  if (!document) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-ink/40">
          초대 링크가 유효하지 않습니다.
        </p>
      </div>
    );
  }

  redirect(`/workspaces/${document.workspace_id}/documents/${documentId}`);
}
