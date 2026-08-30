"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

/**
 * Root error boundary.
 *
 * Shows a recoverable message and a retry button rather than a blank screen. The
 * underlying error is logged but never rendered: stack traces and query details
 * can leak schema information to visitors.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="anim-pop max-w-md text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-coral-50 text-coral-600">
          <Icon name="alert" size={28} />
        </span>

        <h1 className="mt-5 text-h2">Ada yang tidak berjalan semestinya</h1>
        <p className="mt-3 text-navy-500">
          Kami sudah mencatat masalah ini. Coba muat ulang halaman, atau kembali ke
          halaman utama.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-xs text-navy-300">
            Ref: {error.digest}
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary btn-md">
            Coba Lagi
          </button>
          <Link href="/" className="btn btn-outline btn-md">
            Halaman Utama
          </Link>
        </div>
      </div>
    </main>
  );
}
