"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { selfCheckInAction } from "@/server/actions/attendance.actions";

/**
 * Participant self check-in button, shown on their own ticket.
 *
 * The registration code is the credential (no login). Marks attendance through
 * the server action, then shows a confirmed state without a full reload.
 */
export function SelfCheckIn({
  code,
  initialPresent,
}: {
  code: string;
  initialPresent: boolean;
}) {
  const [present, setPresent] = useState(initialPresent);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await selfCheckInAction(code);
      if (result.ok) {
        setPresent(true);
      } else {
        setError(result.reason ?? "Gagal mencatat kehadiran.");
      }
    });
  }

  if (present) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-bold text-emerald-800">
        <Icon name="check-circle" size={18} />
        Kehadiran kamu sudah tercatat. Terima kasih!
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        aria-busy={isPending}
        className="btn btn-primary btn-md w-full"
      >
        {isPending ? (
          <>
            <span
              aria-hidden="true"
              className="anim-spin size-4 rounded-full border-2 border-current border-t-transparent"
            />
            Mencatat...
          </>
        ) : (
          <>
            <Icon name="check-circle" size={17} />
            Absen Sekarang
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs font-semibold text-coral-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
