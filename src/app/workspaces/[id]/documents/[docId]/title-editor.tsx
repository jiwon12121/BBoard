"use client";

import { useState } from "react";

export function TitleEditor({
  title,
  renameAction,
}: {
  title: string;
  renameAction: (formData: FormData) => void;
}) {
  const [value, setValue] = useState(title);
  const changed = value.trim() !== title && value.trim().length > 0;

  return (
    <form action={renameAction} className="flex items-center gap-2">
      <input
        name="title"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[2.5rem] font-semibold tracking-[-0.035em] text-ink hover:border-border-ink focus:border-border-ink focus:outline-none"
      />
      {changed && (
        <button
          type="submit"
          className="shrink-0 text-sm text-ink underline"
        >
          저장
        </button>
      )}
    </form>
  );
}
