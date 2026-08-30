"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { toast } from "@/components/ui/toast";

/**
 * Destructive action with inline confirmation.
 *
 * Uses a two-step inline confirm rather than `window.confirm`: native dialogs
 * block the main thread, can't be styled, and are easy to dismiss by reflex.
 * Auto-cancels after 4s so a half-clicked delete doesn't stay armed.
 */
export function ConfirmButton({
  action,
  children,
  confirmLabel = "Yakin hapus?",
  icon = "trash",
  variant = "danger",
  size = "sm",
  successMessage,
}: {
  action: () => Promise<{ ok: boolean; reason?: string }>;
  children: React.ReactNode;
  confirmLabel?: string;
  icon?: IconName;
  variant?: "danger" | "outline" | "ghost";
  size?: "sm" | "md";
  successMessage?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function arm() {
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 4000);
  }

  function run() {
    if (timer.current) clearTimeout(timer.current);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast(successMessage ?? "Berhasil dihapus.", "success");
      } else {
        toast(result.reason ?? "Gagal menghapus.", "error");
        setArmed(false);
      }
    });
  }

  if (armed) {
    return (
      <span className="anim-fade inline-flex items-center gap-1">
        <button
          type="button"
          onClick={run}
          disabled={isPending}
          aria-busy={isPending}
          className={`btn btn-coral btn-${size}`}
        >
          {isPending ? (
            <span
              aria-hidden="true"
              className="anim-spin size-3.5 rounded-full border-2 border-current border-t-transparent"
            />
          ) : (
            <Icon name="check" size={15} />
          )}
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className={`btn btn-ghost btn-${size}`}
          aria-label="Batal"
        >
          <Icon name="x" size={15} />
        </button>
      </span>
    );
  }

  return (
    <button type="button" onClick={arm} className={`btn btn-${variant} btn-${size}`}>
      <Icon name={icon} size={15} />
      {children}
    </button>
  );
}
