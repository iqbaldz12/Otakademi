"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Select that navigates on change.
 *
 * Rather than submitting a form, it pushes a new URL so the choice lands in the
 * query string: shareable, bookmarkable, and back-button friendly. `useTransition`
 * keeps the old content on screen while the new page streams in instead of
 * flashing a blank state.
 */
export function FilterSelect({
  name,
  value,
  options,
  basePath,
  label,
  className = "",
}: {
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  basePath: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <label htmlFor={name} className="sr-only-x">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        disabled={isPending}
        aria-busy={isPending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => {
            router.push(next ? `${basePath}?${name}=${encodeURIComponent(next)}` : basePath);
          });
        }}
        className={`field field-select py-2 text-sm ${isPending ? "opacity-60" : ""} ${className}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </>
  );
}
