import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {user ? (
        <p>로그인됨: {user.email}</p>
      ) : (
        <Link href="/login" className="underline">
          로그인하러 가기
        </Link>
      )}
    </div>
  );
}
