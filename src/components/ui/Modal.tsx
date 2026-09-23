"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";

/**
 * Accessible modal dialog rendered through a portal on <body>.
 *
 * Portaling escapes any ancestor stacking/overflow context, and rendering on
 * the client only (after mount) keeps SSR output consistent. Closes on Escape
 * and on backdrop click; background scroll is locked while open.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="anim-fade absolute inset-0 bg-navy-950/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="anim-pop relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-navy-100 px-5 py-4">
          <h2 className="text-h3">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-900"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="scroll-slim overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
