"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function DocumentLink({
  href,
  title,
  actions,
}: {
  href: string;
  title: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <li
      className={`flex items-center justify-between rounded-md px-2 py-1 ${
        isActive ? "bg-zinc-100 dark:bg-zinc-800" : ""
      }`}
    >
      <Link
        href={href}
        className={`truncate text-sm ${
          isActive
            ? "font-semibold text-zinc-900 dark:text-zinc-100"
            : "text-zinc-600 hover:underline dark:text-zinc-400"
        }`}
      >
        {title}
      </Link>
      {actions}
    </li>
  );
}
