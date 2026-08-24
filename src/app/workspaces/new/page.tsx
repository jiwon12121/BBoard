"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_workspace", {
      workspace_name: name,
    });
    if (error || !data) {
      setError(error?.message ?? "워크스페이스를 만들지 못했습니다.");
      return;
    }
    router.push(`/workspaces/${data}`);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-8">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="워크스페이스 이름"
          className="rounded-md border border-zinc-300 px-3 py-2"
          required
        />
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          만들기
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
