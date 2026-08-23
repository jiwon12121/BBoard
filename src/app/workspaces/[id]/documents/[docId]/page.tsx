import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { redirect } from "next/navigation";
import { DocumentEditor } from "./editor";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = await params;
  const supabase = await createClient();

  const [{ data: document }, user] = await Promise.all([
    supabase.from("documents").select("id, title").eq("id", docId).single(),
    getCachedUser(),
  ]);

  if (!document) {
    redirect(`/workspaces/${id}`);
  }

  return (
    <DocumentEditor
      documentId={document.id}
      title={document.title}
      userId={user!.id}
      userName={user!.email ?? "익명"}
    />
  );
}
