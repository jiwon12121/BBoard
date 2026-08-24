import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const user = await getCachedUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Link href="/login" className="underline">
          로그인하러 가기
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  redirect(workspaces?.[0] ? `/workspaces/${workspaces[0].id}` : "/workspaces/new");
}
