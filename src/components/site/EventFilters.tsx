import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export type FilterState = {
  category?: string;
  format?: string;
  when?: string;
  q?: string;
};

const WHEN_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "upcoming", label: "Akan Datang" },
  { value: "free", label: "Gratis" },
  { value: "paid", label: "Berbayar" },
  { value: "past", label: "Sudah Lewat" },
];

const FORMAT_OPTIONS = [
  { value: "", label: "Semua Format" },
  { value: "ONLINE", label: "Online" },
  { value: "OFFLINE", label: "Offline" },
  { value: "HYBRID", label: "Hybrid" },
];

/** Builds a querystring, dropping empty values so URLs stay clean. */
function href(base: FilterState, patch: Partial<FilterState>): string {
  const merged = { ...base, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/event?${qs}` : "/event";
}

/**
 * Event filters.
 *
 * Deliberately a server component: filters are plain links and a GET form, so
 * the state lives in the URL. That means filtered views are shareable and
 * bookmarkable, the back button works, and no JavaScript is required. Next
 * handles the navigation client-side, so it still feels instant.
 */
export function EventFilters({
  current,
  categories,
  resultCount,
}: {
  current: FilterState;
  categories: string[];
  resultCount: number;
}) {
  const hasFilters = Boolean(
    current.category || current.format || current.when || current.q,
  );

  return (
    <div className="card p-4 sm:p-5">
      {/* Search: a GET form keeps the other filters via hidden inputs */}
      <form action="/event" method="get" className="flex gap-2">
        {current.category && (
          <input type="hidden" name="category" value={current.category} />
        )}
        {current.format && <input type="hidden" name="format" value={current.format} />}
        {current.when && <input type="hidden" name="when" value={current.when} />}

        <div className="relative flex-1">
          <Icon
            name="search"
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300"
          />
          <input
            type="search"
            name="q"
            defaultValue={current.q ?? ""}
            placeholder="Cari kelas, topik, atau mentor..."
            aria-label="Cari event"
            className="field pl-10"
          />
        </div>
        <button type="submit" className="btn btn-navy btn-md">
          Cari
        </button>
      </form>

      {/* Time / price chips */}
      <div className="mt-4">
        <span className="mb-2 block text-[0.7rem] font-extrabold uppercase tracking-wider text-navy-400">
          Waktu &amp; Biaya
        </span>
        <div className="flex flex-wrap gap-1.5">
          {WHEN_OPTIONS.map((opt) => {
            const active = (current.when ?? "") === opt.value;
            return (
              <Link
                key={opt.value || "all"}
                href={href(current, { when: opt.value })}
                aria-current={active ? "true" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? "bg-navy-800 text-white"
                    : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="mt-4">
          <span className="mb-2 block text-[0.7rem] font-extrabold uppercase tracking-wider text-navy-400">
            Topik
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={href(current, { category: "" })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                !current.category
                  ? "bg-gold-400 text-navy-900"
                  : "bg-navy-50 text-navy-600 hover:bg-navy-100"
              }`}
            >
              Semua Topik
            </Link>
            {categories.map((cat) => {
              const active = current.category === cat;
              return (
                <Link
                  key={cat}
                  href={href(current, { category: active ? "" : cat })}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    active
                      ? "bg-gold-400 text-navy-900"
                      : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Format + result count + reset */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {FORMAT_OPTIONS.map((opt) => {
            const active = (current.format ?? "") === opt.value;
            return (
              <Link
                key={opt.value || "all"}
                href={href(current, { format: opt.value })}
                aria-current={active ? "true" : undefined}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  active
                    ? "border-coral-400 bg-coral-50 text-coral-700"
                    : "border-navy-200 text-navy-500 hover:border-navy-400"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-navy-400 tnum" aria-live="polite">
            {resultCount} event
          </span>
          {hasFilters && (
            <Link href="/event" className="btn btn-ghost btn-sm">
              <Icon name="x" size={14} />
              Reset
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
