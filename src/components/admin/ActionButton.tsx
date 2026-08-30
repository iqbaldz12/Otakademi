"use client";

import { useTransition } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { toast } from "@/components/ui/toast";

/**
 * Fires a server action and reports the outcome as a toast.
 *
 * Used for one-shot admin operations (send reminders, reconcile payments,
 * promote waitlist) where a full form would be overkill.
 */
export function ActionButton({
  action,
  children,
  icon,
  variant = "outline",
  size = "sm",
  pendingText,
  className = "",
}: {
  action: () => Promise<{ ok: boolean; reason?: string }>;
  children: React.ReactNode;
  icon?: IconName;
  variant?: "primary" | "outline" | "ghost" | "navy" | "coral";
  size?: "sm" | "md";
  pendingText?: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await action();
      if (result.reason) {
        toast(result.reason, result.ok ? "success" : "error");
      } else {
        toast(result.ok ? "Berhasil." : "Gagal.", result.ok ? "success" : "error");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={isPending}
      aria-busy={isPending}
      className={`btn btn-${variant} btn-${size} ${className}`}
    >
      {isPending ? (
        <>
          <span
            aria-hidden="true"
            className="anim-spin size-3.5 rounded-full border-2 border-current border-t-transparent"
          />
          {pendingText ?? "Memproses..."}
        </>
      ) : (
        <>
          {icon && <Icon name={icon} size={15} />}
          {children}
        </>
      )}
    </button>
  );
}
