"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginButton() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="rounded-md bg-black px-4 py-2 text-white"
    >
      Google로 로그인
    </button>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={null}>
        <LoginButton />
      </Suspense>
    </div>
  );
}
