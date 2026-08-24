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
    user,
    {
      data: { session },
    },
  ] = await Promise.all([
    supabase.from("documents").select("id, title").eq("id", docId).single(),
    getCachedUser(),
    supabase.auth.getSession(),
  ]);

  if (!document) {
    redirect(`/workspaces/${id}`);
  }

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

  return (
    <DocumentEditor
      documentId={document.id}
      title={document.title}
      userId={user!.id}
      userName={user!.email ?? "익명"}
      accessToken={session?.access_token ?? ""}
      renameAction={renameDocument}
    />
  );
}
