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
      className={`flex items-center justify-between rounded-md px-2 py-1.5 transition-colors ${
        isActive ? "bg-canvas shadow-sm" : "hover:bg-ink/5"
      }`}
    >
      <Link
        href={href}
        className={`flex-1 truncate text-sm ${
          isActive
            ? "font-semibold text-ink"
            : "text-ink/60 hover:text-ink"
        }`}
      >
        {title}
      </Link>
      {actions}
    </li>
  );
}
