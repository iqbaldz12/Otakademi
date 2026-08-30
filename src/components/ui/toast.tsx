"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Minimal toast system.
 *
 * A module-level subscriber list instead of React context: any module can call
 * `toast()` without the whole tree being wrapped in a provider, and the client
 * bundle stays a couple of hundred bytes.
 */

export type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function emit() {
  // Fresh array so React sees a new reference.
  const snapshot = [...items];
  listeners.forEach((l) => l(snapshot));
}

function remove(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function toast(message: string, tone: ToastTone = "info") {
  const id = nextId++;
  items = [...items, { id, message, tone }];
  emit();
  // Errors linger a little longer since they usually need reading.
  setTimeout(() => remove(id), tone === "error" ? 6000 : 3800);
}

const TONE: Record<ToastTone, { icon: IconName; cls: string }> = {
  success: {
    icon: "check-circle",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  error: {
    icon: "x-circle",
    cls: "border-coral-200 bg-coral-50 text-coral-800",
  },
  info: {
    icon: "info",
    cls: "border-navy-200 bg-white text-navy-800",
  },
};

/** Mount once in the root layout. */
export function Toaster() {
  const [list, setList] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.add(setList);
    // Pick up anything queued before mount.
    setList([...items]);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  if (list.length === 0) return null;

  return (
    <div
      // Announce politely so screen readers hear results without interrupting.
      role="status"
      aria-live="polite"
      className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:bottom-auto sm:top-0 sm:items-end"
    >
      {list.map((t) => {
        const tone = TONE[t.tone];
        return (
          <div
            key={t.id}
            className={`anim-pop pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-semibold shadow-lg ${tone.cls}`}
          >
            <Icon name={tone.icon} size={18} className="mt-px" />
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label="Tutup notifikasi"
              className="-m-1 rounded p-1 opacity-60 transition hover:opacity-100"
            >
              <Icon name="x" size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
