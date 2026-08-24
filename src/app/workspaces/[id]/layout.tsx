import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DeleteDocumentButton } from "./delete-document-button";
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
        .select("id, email")
        .in(
          "id",
          memberRows.map((m) => m.user_id),
        )
    : { data: null };

  const members = memberRows?.map((member) => ({
    ...member,
    email: memberProfiles?.find((p) => p.id === member.user_id)?.email,
  }));

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
      <aside className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <WorkspaceSwitcher
            currentName={workspace.name}
            currentId={id}
            workspaces={allWorkspaces ?? []}
          />
          {isOwner && (
            <MemberModal
              members={members}
              ownerId={workspace.owner_id}
              inviteUrl={inviteUrl}
              inviteRole={latestInvite?.role}
              removeMemberAction={removeMember}
              createInviteAction={createInvite}
            />
          )}
        </div>

        <form action={createDocument}>
          <button type="submit" className="text-sm underline">
            + 새 문서
          </button>
        </form>

        <ul className="flex flex-col gap-1">
          {documents?.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between">
              <Link
                href={`/workspaces/${id}/documents/${doc.id}`}
                className="truncate text-sm underline"
              >
                {doc.title}
              </Link>
              {isOwner && (
                <DeleteDocumentButton
                  docId={doc.id}
                  deleteAction={deleteDocument}
                />
              )}
            </li>
          ))}
          {documents?.length === 0 && (
            <p className="text-sm text-zinc-500">문서가 없습니다.</p>
          )}
        </ul>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
