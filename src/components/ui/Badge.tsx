import type { BadgeTone } from "@/lib/domain";

const TONE_CLASS: Record<BadgeTone, string> = {
  gold: "badge-gold",
  coral: "badge-coral",
  navy: "badge-navy",
  green: "badge-green",
  grey: "badge-grey",
};

/** Server component: status pills add zero JS to the page. */
export function Badge({
  tone = "grey",
  children,
  dot = false,
  className = "",
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={`badge ${TONE_CLASS[tone]} ${className}`}>
      {dot && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-current opacity-70"
        />
      )}
      {children}
    </span>
  );
}
