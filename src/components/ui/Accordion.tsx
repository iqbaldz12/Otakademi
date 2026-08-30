import { Icon } from "@/components/ui/Icon";

/**
 * FAQ accordion built on native <details>/<summary>.
 *
 * Zero JavaScript: the browser handles open/close, keyboard interaction, and
 * find-in-page can even reveal collapsed content. The `name` attribute makes the
 * group behave like a true accordion (only one open at a time) natively.
 */
export function Accordion({
  items,
  name = "faq",
}: {
  items: Array<{ q: string; a: string }>;
  name?: string;
}) {
  return (
    <div className="divide-y divide-navy-100 overflow-hidden rounded-[--radius-card] border border-navy-100 bg-white">
      {items.map((item, i) => (
        <details key={i} name={name} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold text-navy-800 transition-colors hover:bg-navy-50/60 [&::-webkit-details-marker]:hidden">
            <span className="text-[0.95rem] leading-snug">{item.q}</span>
            <Icon
              name="chevron-down"
              size={19}
              className="shrink-0 text-navy-400 transition-transform duration-300 group-open:-rotate-180"
            />
          </summary>
          <div className="px-5 pb-5 text-[0.9rem] leading-relaxed text-navy-500">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}
