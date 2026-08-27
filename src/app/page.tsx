import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  redirect(workspaces?.[0] ? `/workspaces/${workspaces[0].id}` : "/workspaces/new");
}
