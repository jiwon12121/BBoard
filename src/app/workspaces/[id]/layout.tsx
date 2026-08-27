import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { ActivitySidebar } from "./activity-sidebar";
import { DocumentLink } from "./document-link";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { WorkspacePresenceProvider } from "./workspace-presence-context";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: workspace }, user, { data: documents }, { data: allWorkspaces }, { data: activityRows }] =
    await Promise.all([
      supabase
        .from("workspaces")
        .select("id, name, owner_id, kind")
        .eq("id", id)
        .single(),
      getCachedUser(),
      supabase
        .from("documents")
        .select("id, title, is_personal, created_by")
        .eq("workspace_id", id)
        .order("updated_at", { ascending: false }),
      supabase.from("workspaces").select("id, name").order("created_at"),
      supabase
        .from("workspace_activity")
        .select("id, message, created_at")
        .eq("workspace_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (!workspace) {
    redirect("/");
  }

  const isOwner = user?.id === workspace.owner_id;

  const [
    { data: latestInvite },
    { data: memberRows },
    { data: ownMembership },
    { data: favoriteRows },
  ] = await Promise.all([
    isOwner
      ? supabase
          .from("workspace_invites")
          .select("token, role")
          .eq("workspace_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Any member can already read the full membership list per RLS - the
    // right sidebar's member list needs it regardless of role, not just
    // the owner-only member management modal.
    supabase.from("workspace_members").select("user_id, role").eq("workspace_id", id),
    !isOwner && user
      ? supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Only depends on `user` (already known from the batch above), not on
    // anything else in this batch - fetching it alongside instead of after
    // saves a full round trip.
    user
      ? supabase.from("document_favorites").select("document_id").eq("user_id", user.id)
      : Promise.resolve({ data: null }),
  ]);

  const roleLabel = isOwner
    ? "소유자"
    : ownMembership?.role === "editor"
      ? "편집 권한"
      : ownMembership?.role === "guest"
        ? "보기 권한"
        : "게스트";
  const canEdit = isOwner || ownMembership?.role === "editor";

  const favoriteDocIds = new Set(favoriteRows?.map((f) => f.document_id));

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

  async function createPersonalDocument() {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("documents")
      .insert({ workspace_id: id, created_by: user.id, is_personal: true })
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

  async function renameDocumentFromList(formData: FormData) {
    "use server";
    const docId = formData.get("docId");
    const title = formData.get("title");
    if (typeof docId !== "string" || typeof title !== "string" || !title.trim()) return;

    const supabase = await createClient();
    await supabase.from("documents").update({ title: title.trim() }).eq("id", docId);

    revalidatePath(`/workspaces/${id}`, "layout");
  }

  async function toggleFavorite(formData: FormData) {
    "use server";
    const docId = formData.get("docId");
    if (typeof docId !== "string") return;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from("document_favorites")
      .select("document_id")
      .eq("user_id", user.id)
      .eq("document_id", docId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("document_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("document_id", docId);
    } else {
      await supabase.from("document_favorites").insert({ user_id: user.id, document_id: docId });
    }

    revalidatePath(`/workspaces/${id}`, "layout");
  }

  async function createInvite(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const role = formData.get("role") === "guest" ? "guest" : "editor";
    await supabase
      .from("workspace_invites")
      .insert({ workspace_id: id, role, created_by: user.id });

    revalidatePath(`/workspaces/${id}`, "layout");
  }

  const inviteUrl = latestInvite
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${latestInvite.token}`
    : null;

  const favoriteDocuments = documents?.filter((doc) => favoriteDocIds.has(doc.id)) ?? [];
  const recentDocuments = (documents ?? []).slice(0, 4);

  const newDocumentButton = (
    <form action={createDocument}>
      <button
        type="submit"
        aria-label="새 문서"
        className="flex w-full cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-lg text-ink/40 hover:bg-ink/5 hover:text-ink"
      >
        +
      </button>
    </form>
  );

  function renderDocLink(doc: { id: string; title: string; is_personal: boolean; created_by: string }) {
    return (
      <DocumentLink
        key={doc.id}
        docId={doc.id}
        href={`/workspaces/${id}/documents/${doc.id}`}
        title={doc.title}
        isFavorite={favoriteDocIds.has(doc.id)}
        canEdit={canEdit || (doc.is_personal && doc.created_by === user?.id)}
        canDelete={isOwner || (doc.is_personal && doc.created_by === user?.id)}
        renameAction={renameDocumentFromList}
        toggleFavoriteAction={toggleFavorite}
        deleteAction={deleteDocument}
      />
    );
  }

  const teamDocuments = documents?.filter((doc) => !doc.is_personal) ?? [];
  const personalDocuments = documents?.filter((doc) => doc.is_personal) ?? [];

  const newPersonalDocumentButton = (
    <form action={createPersonalDocument}>
      <button
        type="submit"
        aria-label="새 개인 문서"
        className="flex w-full cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-lg text-ink/40 hover:bg-ink/5 hover:text-ink"
      >
        +
      </button>
    </form>
  );

  const sidebarLayout = (
    <div className="flex flex-1">
      <aside className="flex w-[292px] shrink-0 flex-col bg-sidebar border-r border-border-ink">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <WorkspaceSwitcher
            currentName={workspace.name}
            currentId={id}
            workspaces={allWorkspaces ?? []}
            memberCount={memberRows?.length ?? 0}
            documentCount={documents?.length ?? 0}
            isOwner={isOwner}
            inviteUrl={inviteUrl}
            inviteRole={latestInvite?.role}
            createInviteAction={createInvite}
          />

          {favoriteDocuments.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[0.65625rem] font-medium uppercase tracking-[0.16em] text-ink/40">
                즐겨찾기 {favoriteDocuments.length}
              </span>
              <ul className="flex flex-col gap-0.5">
                {favoriteDocuments.map(renderDocLink)}
              </ul>
            </div>
          )}

          {recentDocuments.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[0.65625rem] font-medium uppercase tracking-[0.16em] text-ink/40">
                최근 수정한 문서
              </span>
              <ul className="flex flex-col gap-0.5">
                {recentDocuments.map(renderDocLink)}
              </ul>
            </div>
          )}

          {workspace.kind === "personal" ? (
            <div className="flex flex-col gap-1">
              <span className="text-[0.65625rem] font-medium uppercase tracking-[0.16em] text-ink/40">
                개인 문서 {documents?.length ?? 0}
              </span>
              <ul className="flex flex-col gap-0.5">
                {documents?.map(renderDocLink)}
                {documents?.length === 0 && (
                  <p className="text-sm text-ink/40">문서가 없습니다.</p>
                )}
              </ul>
              {newDocumentButton}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-[0.65625rem] font-medium uppercase tracking-[0.16em] text-ink/40">
                  팀 문서 {teamDocuments.length}
                </span>
                <ul className="flex flex-col gap-0.5">
                  {teamDocuments.map(renderDocLink)}
                  {teamDocuments.length === 0 && (
                    <p className="text-sm text-ink/40">문서가 없습니다.</p>
                  )}
                </ul>
                {newDocumentButton}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[0.65625rem] font-medium uppercase tracking-[0.16em] text-ink/40">
                  개인 문서 {personalDocuments.length}
                </span>
                <ul className="flex flex-col gap-0.5">
                  {personalDocuments.map(renderDocLink)}
                  {personalDocuments.length === 0 && (
                    <p className="text-sm text-ink/40">문서가 없습니다.</p>
                  )}
                </ul>
                {newPersonalDocumentButton}
              </div>
            </>
          )}
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
      {user && (
        <ActivitySidebar workspaceId={id} members={members} initialActivity={activityRows ?? []} />
      )}
    </div>
  );

  if (!user) return sidebarLayout;

  return (
    <WorkspacePresenceProvider
      workspaceId={id}
      userId={user.id}
      userName={user.user_metadata?.full_name ?? user.email ?? "익명"}
      isOwner={isOwner}
    >
      {sidebarLayout}
    </WorkspacePresenceProvider>
  );
}
