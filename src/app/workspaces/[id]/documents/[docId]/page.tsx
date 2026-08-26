import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DocumentEditor } from "./editor";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = await params;
  const supabase = await createClient();

  const [
    { data: document },
    { data: workspace },
    user,
    {
      data: { session },
    },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, width, is_personal, created_by")
      .eq("id", docId)
      .single(),
    supabase.from("workspaces").select("kind, owner_id").eq("id", id).single(),
    getCachedUser(),
    supabase.auth.getSession(),
  ]);

  if (!document) {
    redirect(`/workspaces/${id}`);
  }

  const isOwner = user?.id === workspace?.owner_id;

  // Sharing a single document applies to: the owner of a personal-kind
  // workspace (sharing any of its documents), or a member's own personal
  // document inside a team workspace (sharing just that one document).
  const canShare =
    (isOwner && workspace?.kind === "personal") ||
    (workspace?.kind === "team" && document.is_personal && document.created_by === user?.id);

  const [{ data: ownWorkspaceMembership }, { data: ownDocumentMembership }] = user
    ? await Promise.all([
        supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("document_members")
          .select("role")
          .eq("document_id", docId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  // Whether this user can actually type in the editor - separate from
  // canShare/isOwner, since a guest (workspace-level or document-level)
  // should be able to view a document without being able to edit it.
  const editable =
    isOwner ||
    (document.is_personal
      ? document.created_by === user?.id
      : ownWorkspaceMembership?.role === "editor") ||
    ownDocumentMembership?.role === "editor";

  const { data: latestDocumentInvite } = canShare
    ? await supabase
        .from("document_invites")
        .select("token, role")
        .eq("document_id", docId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  async function renameDocument(formData: FormData) {
    "use server";
    const title = formData.get("title");
    if (typeof title !== "string" || !title.trim()) return;

    const supabase = await createClient();
    await supabase
      .from("documents")
      .update({ title: title.trim() })
      .eq("id", docId);

    revalidatePath(`/workspaces/${id}`, "layout");
    redirect(`/workspaces/${id}/documents/${docId}`);
  }

  async function updateWidth(width: number) {
    "use server";
    const supabase = await createClient();
    await supabase.from("documents").update({ width }).eq("id", docId);
  }

  async function createDocumentInvite(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const role = formData.get("role") === "guest" ? "guest" : "editor";
    await supabase
      .from("document_invites")
      .insert({ document_id: docId, role, created_by: user.id });

    revalidatePath(`/workspaces/${id}/documents/${docId}`);
  }

  const documentInviteUrl = latestDocumentInvite
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/document/${latestDocumentInvite.token}`
    : null;

  return (
    <DocumentEditor
      documentId={document.id}
      title={document.title}
      width={document.width}
      userId={user!.id}
      userName={user!.user_metadata?.full_name ?? user!.email ?? "익명"}
      accessToken={session?.access_token ?? ""}
      renameAction={renameDocument}
      updateWidthAction={updateWidth}
      editable={editable}
      canShare={canShare}
      documentInviteUrl={documentInviteUrl}
      documentInviteRole={latestDocumentInvite?.role}
      createDocumentInviteAction={createDocumentInvite}
    />
  );
}
