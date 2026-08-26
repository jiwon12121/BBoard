import { createClient } from "@/lib/supabase/client";

export async function uploadDocumentImage(file: File): Promise<string | null> {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const path = `${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

  const supabase = createClient();
  const { error } = await supabase.storage.from("document-images").upload(path, file);
  if (error) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from("document-images").getPublicUrl(path);
  return publicUrl;
}
