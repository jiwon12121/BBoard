"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="설정"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink/40 hover:bg-canvas hover:text-ink"
      >
        ⚙
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 z-50 mb-1 w-32 rounded-md border border-border-ink bg-canvas p-1 shadow-lg">
            <button
              onClick={handleLogout}
              className="block w-full rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-sidebar"
            >
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  );
}
