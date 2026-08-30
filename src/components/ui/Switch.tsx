"use client";

import { useOptimistic, useTransition, useId } from "react";
import { toast } from "@/components/ui/toast";

/**
 * Accessible on/off switch backed by a server action.
 *
 * Built on a real <button role="switch"> rather than a styled checkbox so
 * keyboard and screen-reader behaviour comes for free (Space/Enter toggle,
 * state announced via aria-checked).
 *
 * The optimistic value flips immediately, so the thumb slides the moment you
 * click even though the database round trip is still in flight. If the action
 * reports a failure, React discards the optimistic value and the switch snaps
 * back, with the reason surfaced as a toast.
 */
export function Switch({
  checked,
  onToggle,
  labelOn = "Aktif",
  labelOff = "Non-aktif",
  messageOn = "Berhasil diaktifkan.",
  messageOff = "Berhasil dinon-aktifkan.",
  disabled = false,
  disabledReason,
  size = "md",
  showLabel = true,
  ariaLabel,
}: {
  checked: boolean;
  /** Returns ok:false plus a reason to reject the change. */
  onToggle: (next: boolean) => Promise<{ ok: boolean; reason?: string }>;
  labelOn?: string;
  labelOff?: string;
  /** Confirmation copy, so events and promos can describe their own effect. */
  messageOn?: string;
  messageOff?: string;
  disabled?: boolean;
  disabledReason?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  ariaLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const labelId = useId();

  const dims =
    size === "sm"
      ? { track: "h-5 w-9", thumb: "size-3.5", shift: "translate-x-4" }
      : { track: "h-6 w-11", thumb: "size-4.5", shift: "translate-x-5" };

  function handleClick() {
    if (disabled || isPending) {
      if (disabled && disabledReason) toast(disabledReason, "info");
      return;
    }

    const next = !optimistic;

    startTransition(async () => {
      // Optimistic update must happen inside the transition to be tracked.
      setOptimistic(next);
      const result = await onToggle(next);

      if (!result.ok) {
        toast(result.reason ?? "Gagal mengubah status.", "error");
        return;
      }

      toast(next ? messageOn : messageOff, "success");
    });
  }

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : showLabel ? labelId : undefined}
        aria-busy={isPending}
        disabled={disabled}
        onClick={handleClick}
        title={disabled ? disabledReason : optimistic ? labelOn : labelOff}
        className={[
          dims.track,
          "relative inline-flex shrink-0 cursor-pointer items-center rounded-full",
          "transition-colors duration-200 ease-out",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400",
          optimistic ? "bg-emerald-500" : "bg-navy-200",
          disabled && "cursor-not-allowed opacity-50",
          isPending && "cursor-progress",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            dims.thumb,
            "pointer-events-none ml-0.5 rounded-full bg-white shadow-sm",
            "transition-transform duration-200 [transition-timing-function:var(--ease-spring)]",
            optimistic ? dims.shift : "translate-x-0",
          ].join(" ")}
        />
      </button>

      {showLabel && (
        <span
          id={labelId}
          className={[
            "text-xs font-bold tabular-nums transition-colors",
            optimistic ? "text-emerald-700" : "text-navy-400",
          ].join(" ")}
        >
          {optimistic ? labelOn : labelOff}
        </span>
      )}
    </div>
  );
}
