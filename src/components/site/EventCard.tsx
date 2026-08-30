import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { EVENT_FORMAT_META, type EventFormatName } from "@/lib/domain";
import { formatPrice, fmtDateShort, fmtTime } from "@/lib/format";
import type { EventWithSeats } from "@/server/services/event.service";

const FORMAT_ICON = { ONLINE: "monitor", OFFLINE: "pin", HYBRID: "globe" } as const;

/**
 * Event card used on the landing page and the listing.
 *
 * Entirely server-rendered. The hover lift, the accent bar wipe, and the arrow
 * nudge are CSS transitions driven by `group-hover`, so the whole grid stays
 * interactive with zero JavaScript.
 */
export function EventCard({
  event,
  reveal = false,
  delayClass = "",
}: {
  event: EventWithSeats;
  reveal?: boolean;
  delayClass?: string;
}) {
  const { seats } = event;
  const isFree = event.price === 0;
  const format = EVENT_FORMAT_META[event.format as EventFormatName];
  // CLOSED events never reach the public site, so "finished" is the only
  // read-only state a visitor can encounter here.
  const closed = event.status === "COMPLETED";
  const soldOut = event.status === "SOLD_OUT" || seats.isFull;

  return (
    <article
      className={`card card-interactive group relative flex flex-col overflow-hidden ${
        reveal ? "reveal" : ""
      } ${delayClass}`}
    >
      {/* Banner image if uploaded; otherwise the colour accent bar. */}
      {event.bannerImage ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-navy-100">
          <Image
            src={event.bannerImage}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
            className="object-cover transition-transform duration-500 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-[1.04]"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-1"
            style={{ backgroundColor: event.bannerColor }}
            aria-hidden="true"
          />
        </div>
      ) : (
        <div className="relative h-2 w-full overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0" style={{ backgroundColor: event.bannerColor }} />
          <div className="absolute inset-0 -translate-x-full bg-white/35 transition-transform duration-500 [transition-timing-function:var(--ease-out-expo)] group-hover:translate-x-0" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* Meta row */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Badge tone="navy">{event.category}</Badge>
          {soldOut && <Badge tone="coral">Kuota Penuh</Badge>}
          {closed && <Badge tone="grey">Selesai</Badge>}
          {!soldOut && !closed && seats.scarcity === "critical" && (
            <Badge tone="coral" dot>
              Sisa {seats.remaining} kursi
            </Badge>
          )}
          {!soldOut && !closed && seats.scarcity === "low" && (
            <Badge tone="gold" dot>
              Hampir penuh
            </Badge>
          )}
        </div>

        <h3 className="text-h3 font-extrabold text-navy-900">
          <Link
            href={`/event/${event.slug}`}
            className="line-2 outline-none after:absolute after:inset-0 after:content-['']"
          >
            {event.title}
          </Link>
        </h3>

        {event.summary && (
          <p className="mt-2 line-2 text-sm leading-relaxed text-navy-500">
            {event.summary}
          </p>
        )}

        {/* Facts */}
        {/* Icons sit inside the dd so each wrapper div contains only dt + dd. */}
        <dl className="mt-4 space-y-1.5 text-[0.8125rem] text-navy-600">
          <div className="flex items-center gap-2">
            <dt className="sr-only-x">Tanggal</dt>
            <dd className="flex items-center gap-2 font-semibold">
              <Icon name="calendar" size={15} className="shrink-0 text-navy-400" />
              {fmtDateShort(event.startAt)} &middot; {fmtTime(event.startAt)} WIB
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only-x">Format</dt>
            <dd className="flex items-center gap-2 font-semibold">
              <Icon
                name={FORMAT_ICON[event.format as EventFormatName]}
                size={15}
                className="shrink-0 text-navy-400"
              />
              {format.label}
              {event.venue ? ` · ${event.venue}` : ""}
            </dd>
          </div>
          {event.mentorName && (
            <div className="flex items-center gap-2">
              <dt className="sr-only-x">Mentor</dt>
              <dd className="flex items-center gap-2 font-semibold">
                <Icon name="users" size={15} className="shrink-0 text-navy-400" />
                <span className="line-2">{event.mentorName}</span>
              </dd>
            </div>
          )}
        </dl>

        {/* Capacity meter, only when it carries information */}
        {!seats.isUnlimited && !closed && (
          <div className="mt-4">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-navy-100"
              role="progressbar"
              aria-valuenow={seats.percentFull}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Kuota terisi ${seats.percentFull} persen`}
            >
              <div
                className="h-full rounded-full transition-[width] duration-700 [transition-timing-function:var(--ease-out-expo)]"
                style={{
                  width: `${Math.max(4, seats.percentFull)}%`,
                  backgroundColor:
                    seats.scarcity === "critical" || seats.scarcity === "full"
                      ? "var(--color-coral-400)"
                      : seats.scarcity === "low"
                        ? "var(--color-gold-400)"
                        : "var(--color-navy-300)",
                }}
              />
            </div>
            <p className="mt-1.5 text-[0.7rem] font-semibold text-navy-400 tnum">
              {seats.taken} dari {seats.capacity} kursi terisi
            </p>
          </div>
        )}

        {/* Price + CTA affordance */}
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-navy-100 pt-4">
          <div>
            <span className="block text-[0.68rem] font-bold uppercase tracking-wide text-navy-400">
              {isFree ? "Biaya" : "Mulai dari"}
            </span>
            <span
              className={`text-lg font-extrabold tnum ${
                isFree ? "text-emerald-600" : "text-navy-900"
              }`}
            >
              {formatPrice(event.price)}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-sm font-extrabold text-gold-700">
            Detail
            <Icon
              name="arrow-right"
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </span>
        </div>
      </div>
    </article>
  );
}
