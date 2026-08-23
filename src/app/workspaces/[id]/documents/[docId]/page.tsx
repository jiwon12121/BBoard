import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DocumentEditor } from "./editor";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = await params;
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, title")
    .eq("id", docId)
    .single();

  if (!document) {
    redirect(`/workspaces/${id}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <DocumentEditor
      documentId={document.id}
      title={document.title}
      userId={user!.id}
      userName={user!.email ?? "익명"}
    />
  );
}
