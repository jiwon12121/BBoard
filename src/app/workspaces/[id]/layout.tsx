import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { DeleteDocumentButton } from "./delete-document-button";
import { DocumentLink } from "./document-link";
import { MemberModal } from "./member-modal";
import { WorkspaceSwitcher } from "./workspace-switcher";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: workspace },
    user,
    { data: documents },
    { data: allWorkspaces },
    { count: memberCount },
  ] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id, name, owner_id")
      .eq("id", id)
      .single(),
    getCachedUser(),
    supabase
      .from("documents")
      .select("id, title")
      .eq("workspace_id", id)
      .order("updated_at", { ascending: false }),
    supabase.from("workspaces").select("id, name").order("created_at"),
    supabase
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", id),
  ]);

  if (!workspace) {
    redirect("/");
  }

  const isOwner = user?.id === workspace.owner_id;

  const [{ data: latestInvite }, { data: memberRows }, { data: ownMembership }] =
    await Promise.all([
      isOwner
        ? supabase
            .from("workspace_invites")
            .select("token, role")
            .eq("workspace_id", id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      isOwner
        ? supabase
            .from("workspace_members")
            .select("user_id, role")
            .eq("workspace_id", id)
        : Promise.resolve({ data: null }),
      !isOwner && user
        ? supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const roleLabel = isOwner
    ? "소유자"
    : ownMembership?.role === "viewer"
      ? "보기 권한"
      : "편집 권한";

  const { data: memberProfiles } = memberRows?.length
    ? await supabase
        .from("profiles")
        .select("id, email, name")
        .in(
          "id",
          memberRows.map((m) => m.user_id),
        )
    : { data: null };

  const members = memberRows?.map((member) => {
    const profile = memberProfiles?.find((p) => p.id === member.user_id);
    return {
      ...member,
      email: profile?.email,
      name: profile?.name,
    };
  });

  async function createDocument() {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("documents")
      .insert({ workspace_id: id, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) return;

    revalidatePath(`/workspaces/${id}`, "layout");
    redirect(`/workspaces/${id}/documents/${data.id}`);
  }

  async function deleteDocument(formData: FormData) {
    "use server";
    const docId = formData.get("docId");
    if (typeof docId !== "string") return;

    const supabase = await createClient();
    await supabase.from("documents").delete().eq("id", docId);

    revalidatePath(`/workspaces/${id}`, "layout");
    redirect(`/workspaces/${id}`);
  }

  async function removeMember(formData: FormData) {
    "use server";
    const userId = formData.get("userId");
    if (typeof userId !== "string") return;

    const supabase = await createClient();
    await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", id)
      .eq("user_id", userId);

    revalidatePath(`/workspaces/${id}`, "layout");
    redirect(`/workspaces/${id}`);
  }

  async function createInvite(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const role = formData.get("role") === "viewer" ? "viewer" : "editor";
    await supabase
      .from("workspace_invites")
      .insert({ workspace_id: id, role, created_by: user.id });

    revalidatePath(`/workspaces/${id}`, "layout");
    redirect(`/workspaces/${id}`);
  }

  const inviteUrl = latestInvite
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${latestInvite.token}`
    : null;

  return (
    <div className="flex flex-1">
      <aside className="flex w-[292px] shrink-0 flex-col bg-sidebar border-r border-border-ink">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-1">
            <WorkspaceSwitcher
              currentName={workspace.name}
              currentId={id}
              workspaces={allWorkspaces ?? []}
              memberCount={memberCount ?? 0}
              documentCount={documents?.length ?? 0}
            />
            {user && (
              <div className="px-1">
                <MemberModal
                  members={members}
                  ownerId={workspace.owner_id}
                  isOwner={isOwner}
                  workspaceId={id}
                  currentUserId={user.id}
                  currentUserName={user.user_metadata?.full_name ?? user.email ?? "익명"}
                  inviteUrl={inviteUrl}
                  inviteRole={latestInvite?.role}
                  removeMemberAction={removeMember}
                  createInviteAction={createInvite}
                />
              </div>
            )}
          </div>

          <form action={createDocument}>
            <button
              type="submit"
              className="text-sm text-ink/70 underline hover:text-ink"
            >
              + 새 문서
            </button>
          </form>

          <div className="flex flex-col gap-1">
            <span className="text-[0.65625rem] font-medium uppercase tracking-[0.16em] text-ink/40">
              문서 {documents?.length ?? 0}
            </span>
            <ul className="flex flex-col gap-0.5">
              {documents?.map((doc) => (
                <DocumentLink
                  key={doc.id}
                  href={`/workspaces/${id}/documents/${doc.id}`}
                  title={doc.title}
                  actions={
                    isOwner && (
                      <DeleteDocumentButton
                        docId={doc.id}
                        deleteAction={deleteDocument}
                      />
                    )
                  }
                />
              ))}
              {documents?.length === 0 && (
                <p className="text-sm text-ink/40">문서가 없습니다.</p>
              )}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border-ink p-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-semibold text-canvas">
              {(user?.user_metadata?.full_name ?? user?.email ?? "?").slice(0, 1)}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm text-ink">
                {user?.user_metadata?.full_name ?? user?.email}
              </span>
              <span className="flex items-center gap-1 text-xs text-ink/40">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {roleLabel} · 온라인
              </span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-canvas">{children}</main>
    </div>
  );
}
