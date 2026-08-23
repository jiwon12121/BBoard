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

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!workspace) {
    redirect("/");
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("id, title")
    .eq("workspace_id", id)
    .order("updated_at", { ascending: false });

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

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-8">
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
    </div>
  );
}
