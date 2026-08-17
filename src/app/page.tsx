import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Link href="/login" className="underline">
          로그인하러 가기
        </Link>
      </div>
    );
  }

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">워크스페이스</h1>
        <Link href="/workspaces/new" className="underline">
          + 새로 만들기
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {workspaces?.map((workspace) => (
          <li key={workspace.id}>{workspace.name}</li>
        ))}
        {workspaces?.length === 0 && (
          <p className="text-sm text-zinc-500">아직 워크스페이스가 없습니다.</p>
        )}
      </ul>
    </div>
  );
}
