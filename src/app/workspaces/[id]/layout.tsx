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

  const [{ data: workspace }, user, { data: documents }, { data: allWorkspaces }] =
    await Promise.all([
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
    ]);

  if (!workspace) {
    redirect("/");
  }

  const isOwner = user?.id === workspace.owner_id;

  const [{ data: latestInvite }, { data: memberRows }] = isOwner
    ? await Promise.all([
        supabase
          .from("workspace_invites")
          .select("token, role")
          .eq("workspace_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("workspace_members")
          .select("user_id, role")
          .eq("workspace_id", id),
      ])
    : [{ data: null }, { data: null }];

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
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-zinc-400">
              BBoard
            </span>
            <div className="flex items-center justify-between">
              <WorkspaceSwitcher
                currentName={workspace.name}
                currentId={id}
                workspaces={allWorkspaces ?? []}
              />
              {user && (
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
              )}
            </div>
          </div>

          <form action={createDocument}>
            <button type="submit" className="text-sm underline">
              + 새 문서
            </button>
          </form>

          <ul className="flex flex-col gap-1">
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
              <p className="text-sm text-zinc-500">문서가 없습니다.</p>
            )}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <span className="truncate text-xs text-zinc-500">
            {user?.user_metadata?.full_name ?? user?.email}
          </span>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
