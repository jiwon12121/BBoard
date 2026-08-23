import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: workspace },
    {
      data: { user },
    },
    { data: documents },
  ] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id, name, owner_id")
      .eq("id", id)
      .single(),
    supabase.auth.getUser(),
    supabase
      .from("documents")
      .select("id, title")
      .eq("workspace_id", id)
      .order("updated_at", { ascending: false }),
  ]);

  if (!workspace) {
    redirect("/");
  }

  const isOwner = user?.id === workspace.owner_id;

  const { data: latestInvite } = isOwner
    ? await supabase
        .from("workspace_invites")
        .select("token, role")
        .eq("workspace_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

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

    redirect(`/workspaces/${id}/documents/${data.id}`);
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

    redirect(`/workspaces/${id}`);
  }

  const inviteUrl = latestInvite
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${latestInvite.token}`
    : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{workspace.name}</h1>
        <form action={createDocument}>
          <button type="submit" className="underline">
            + 새 문서
          </button>
        </form>
      </div>
      <ul className="flex flex-col gap-2">
        {documents?.map((doc) => (
          <li key={doc.id}>
            <Link
              href={`/workspaces/${id}/documents/${doc.id}`}
              className="underline"
            >
              {doc.title}
            </Link>
          </li>
        ))}
        {documents?.length === 0 && (
          <p className="text-sm text-zinc-500">문서가 없습니다.</p>
        )}
      </ul>

      {isOwner && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4">
          <h2 className="text-sm font-semibold">멤버 초대</h2>
          {inviteUrl && (
            <div className="flex flex-col gap-1 rounded-md bg-zinc-100 p-2">
              <span className="text-xs text-zinc-500">
                {latestInvite!.role} 권한으로 참여
              </span>
              <p className="break-all text-xs text-zinc-900">{inviteUrl}</p>
            </div>
          )}
          <form action={createInvite} className="flex items-center gap-2">
            <select
              name="role"
              defaultValue="editor"
              className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
            >
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-black px-3 py-1 text-sm text-white"
            >
              초대 링크 생성
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
