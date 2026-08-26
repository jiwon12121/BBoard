"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const DEFAULT_WIDTH = 896;
const MIN_WIDTH = 480;
const MAX_WIDTH = 1400;

export function ResizableColumn({
  width,
  onWidthChange,
  children,
}: {
  width: number | null;
  onWidthChange: (width: number) => void;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localWidth, setLocalWidth] = useState(width ?? DEFAULT_WIDTH);
  const latestWidthRef = useRef(localWidth);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (dragging) return;
    setLocalWidth(width ?? DEFAULT_WIDTH);
  }, [width, dragging]);

  useEffect(() => {
    if (!dragging) return;

    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const centerX = rect.left + rect.width / 2;
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, Math.abs(e.clientX - centerX) * 2),
      );
      latestWidthRef.current = newWidth;
      setLocalWidth(newWidth);
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = "";
      onWidthChange(Math.round(latestWidthRef.current));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [dragging, onWidthChange]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto"
      style={{ maxWidth: localWidth }}
    >
      {children}
      <button
        aria-label="문서 너비 조절"
        onMouseDown={() => setDragging(true)}
        className="absolute -left-3 top-0 h-full w-1.5 cursor-col-resize rounded bg-transparent hover:bg-border-ink"
      />
      <button
        aria-label="문서 너비 조절"
        onMouseDown={() => setDragging(true)}
        className="absolute -right-3 top-0 h-full w-1.5 cursor-col-resize rounded bg-transparent hover:bg-border-ink"
      />
      {dragging && (
        // A youtube embed is a separate browsing context - if the cursor
        // crosses over one mid-drag, mousemove/mouseup stop reaching the
        // window listeners above entirely. This sits above everything
        // (including any iframe) so the drag keeps hit-testing against our
        // own page instead.
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
    </div>
  );
}
