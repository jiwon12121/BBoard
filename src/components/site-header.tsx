import { getCachedUser } from "@/lib/supabase/get-user";
import Link from "next/link";
import { LogoutButton } from "./logout-button";

export async function SiteHeader() {
  const user = await getCachedUser();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <Link href="/" className="text-sm font-semibold">
        BBoard
      </Link>
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{user.email}</span>
          <LogoutButton />
        </div>
      )}
    </header>
  );
}
