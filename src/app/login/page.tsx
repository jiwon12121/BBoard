import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginCard } from "./login-card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next && next.startsWith("/") ? next : "/");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
