"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const DEFAULT_WIDTH = 896;
const MIN_WIDTH = 480;
const MAX_WIDTH = 1400;
const STORAGE_KEY = "bboard:document-width";

export function ResizableColumn({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setWidth(Number(stored));
    } catch {
      // localStorage unavailable — fall back to the default width.
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;

    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const centerX = rect.left + rect.width / 2;
      const newWidth = Math.abs(e.clientX - centerX) * 2;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = "";
      setWidth((w) => {
        try {
          window.localStorage.setItem(STORAGE_KEY, String(w));
        } catch {
          // ignore
        }
        return w;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto"
      style={{ maxWidth: width }}
    >
      {children}
      <button
        aria-label="문서 너비 조절"
        onMouseDown={() => setDragging(true)}
        className="absolute -left-3 top-0 h-full w-1.5 cursor-col-resize rounded bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-700"
      />
      <button
        aria-label="문서 너비 조절"
        onMouseDown={() => setDragging(true)}
        className="absolute -right-3 top-0 h-full w-1.5 cursor-col-resize rounded bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-700"
      />
    </div>
  );
}
