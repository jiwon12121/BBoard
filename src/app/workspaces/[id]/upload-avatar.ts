import { createClient } from "@/lib/supabase/client";

// Path is prefixed with the user's own id (not just a random name, like
// document images) - the avatars bucket's storage policies restrict
// writes to files under a user's own id-prefixed folder, so this has to
// match that shape or the upload gets rejected by RLS.
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const path = `${userId}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

  const supabase = createClient();
  const { error } = await supabase.storage.from("avatars").upload(path, file);
  if (error) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  return publicUrl;
}
