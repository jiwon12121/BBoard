"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"personal" | "team">("team");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_workspace", {
      workspace_name: name,
      workspace_kind_param: kind,
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
          className="rounded-md border border-border-ink bg-canvas px-3 py-2 text-ink"
          required
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind("team")}
            className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-left text-sm ${
              kind === "team"
                ? "border-ink bg-ink text-canvas"
                : "border-border-ink bg-canvas text-ink hover:bg-sidebar"
            }`}
          >
            <span className="block font-medium">팀 워크스페이스</span>
            <span className={`block text-xs ${kind === "team" ? "text-canvas/70" : "text-ink/40"}`}>
              워크스페이스 단위로 멤버 초대
            </span>
          </button>
          <button
            type="button"
            onClick={() => setKind("personal")}
            className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-left text-sm ${
              kind === "personal"
                ? "border-ink bg-ink text-canvas"
                : "border-border-ink bg-canvas text-ink hover:bg-sidebar"
            }`}
          >
            <span className="block font-medium">개인용 워크스페이스</span>
            <span className={`block text-xs ${kind === "personal" ? "text-canvas/70" : "text-ink/40"}`}>
              워크스페이스 또는 문서 단위로 초대
            </span>
          </button>
        </div>

        <button
          type="submit"
          className="cursor-pointer rounded-md bg-ink px-4 py-2 text-canvas"
        >
          만들기
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
