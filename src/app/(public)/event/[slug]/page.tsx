import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { getEventBySlug } from "@/server/services/event.service";
import { db } from "@/server/db";
import { EVENT_FORMAT_META, type EventFormatName } from "@/lib/domain";
import {
  formatPrice,
  fmtDateLong,
  formatTimeRange,
  daysUntil,
  buildIcsDataUrl,
} from "@/lib/format";

const FORMAT_ICON: Record<EventFormatName, IconName> = {
  ONLINE: "monitor",
  OFFLINE: "pin",
  HYBRID: "globe",
};

export const revalidate = 60;

/** Pre-render the live events at build time; the rest render on first request. */
export async function generateStaticParams() {
  const events = await db.event.findMany({
    where: { status: { in: ["PUBLISHED", "SOLD_OUT"] } },
    select: { slug: true },
    take: 50,
  });
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    return { title: "Event tidak ditemukan" };
  }

  const description =
    event.summary ??
    event.description?.slice(0, 155) ??
    `Ikuti ${event.title} bersama Otakademi.`;

  return {
    title: event.title,
    description,
    alternates: { canonical: `/event/${event.slug}` },
    openGraph: {
      title: event.title,
      description,
      type: "article",
      url: `/event/${event.slug}`,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) notFound();

  const { seats } = event;
  const format = EVENT_FORMAT_META[event.format as EventFormatName];
  const isFree = event.price === 0;
  const days = daysUntil(event.startAt);
  const isPast = event.startAt < new Date();

  // Hidden statuses are filtered out upstream by getEventBySlug, so the only
  // read-only cases left are a finished event or one whose start time has passed.
  const registrationClosed = event.status === "COMPLETED" || isPast;

  const location =
    event.format === "ONLINE"
      ? (event.venue ?? "Online")
      : (event.venue ?? "Akan diinformasikan");

  const icsUrl = buildIcsDataUrl({
    title: event.title,
    description: event.summary ?? "",
    location,
    start: event.startAt,
    end: event.endAt,
    uid: event.id,
  });

  /**
   * Event structured data so Google can show rich results
   * (spec section 12: "structured event data bila memungkinkan").
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    name: event.title,
    description: event.summary ?? event.description ?? undefined,
    startDate: event.startAt.toISOString(),
    endDate: event.endAt.toISOString(),
    eventAttendanceMode:
      event.format === "ONLINE"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : event.format === "HYBRID"
          ? "https://schema.org/MixedEventAttendanceMode"
          : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus:
      event.status === "CANCELLED"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    location:
      event.format === "ONLINE"
        ? { "@type": "VirtualLocation", url: event.meetingLink ?? undefined }
        : { "@type": "Place", name: location, address: location },
    organizer: {
      "@type": "Organization",
      name: "Otakademi",
      url: process.env.NEXT_PUBLIC_SITE_URL,
    },
    offers: {
      "@type": "Offer",
      price: event.price,
      priceCurrency: "IDR",
      availability: seats.isFull
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/event/${event.slug}`,
    },
    ...(event.mentorName && {
      performer: { "@type": "Person", name: event.mentorName },
    }),
  };

  const facts: Array<{ icon: IconName; label: string; value: string }> = [
    { icon: "calendar", label: "Tanggal", value: fmtDateLong(event.startAt) },
    { icon: "clock", label: "Waktu", value: formatTimeRange(event.startAt, event.endAt) },
    {
      icon: FORMAT_ICON[event.format as EventFormatName],
      label: "Format",
      value: `${format.label}${event.venue ? ` - ${event.venue}` : ""}`,
    },
    {
      icon: "users",
      label: "Kuota",
      value: seats.isUnlimited
        ? "Tanpa batas"
        : `${seats.capacity} peserta (${seats.taken} terisi)`,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data is generated from our own DB, not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Banner: uploaded image when present, otherwise the accent colour bar. */}
      {event.bannerImage ? (
        <div className="relative aspect-[21/9] w-full overflow-hidden bg-navy-100 sm:aspect-[3/1]">
          <Image
            src={event.bannerImage}
            alt={`Banner ${event.title}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Accent underline keeps the brand colour even with a photo. */}
          <div
            className="absolute inset-x-0 bottom-0 h-1.5"
            style={{ backgroundColor: event.bannerColor }}
            aria-hidden="true"
          />
        </div>
      ) : (
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: event.bannerColor }}
          aria-hidden="true"
        />
      )}

      <section className="bg-gold-50/40">
        <div className="container-page py-8 lg:py-12">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-navy-400">
              <li>
                <Link href="/" className="transition-colors hover:text-navy-700">
                  Home
                </Link>
              </li>
              <li aria-hidden="true"><Icon name="chevron-right" size={13} /></li>
              <li>
                <Link href="/event" className="transition-colors hover:text-navy-700">
                  Kelas &amp; Event
                </Link>
              </li>
              <li aria-hidden="true"><Icon name="chevron-right" size={13} /></li>
              <li className="line-2 text-navy-700">{event.title}</li>
            </ol>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr] lg:gap-10">
            {/* ---------- Main column ---------- */}
            <div className="anim-enter">
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <Badge tone="navy">{event.category}</Badge>
                <Badge tone="grey">{format.label}</Badge>
                {seats.isFull && <Badge tone="coral">Kuota Penuh</Badge>}
                {registrationClosed && <Badge tone="grey">Sudah Berlangsung</Badge>}
                {!registrationClosed && !seats.isFull && days >= 0 && days <= 7 && (
                  <Badge tone="coral" dot>
                    {days === 0 ? "Hari ini" : `${days} hari lagi`}
                  </Badge>
                )}
              </div>

              <h1 className="text-h1">{event.title}</h1>

              {event.summary && (
                <p className="mt-4 max-w-2xl text-lead text-navy-500">{event.summary}</p>
              )}

              {/* Outcomes: the highest-value block, so it sits first */}
              {event.outcomes.length > 0 && (
                <div className="mt-8 rounded-[--radius-card] border border-navy-100 bg-navy-50/70 p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 text-h3">
                    <Icon name="target" size={20} className="text-coral-600" />
                    Yang akan kamu dapat
                  </h2>
                  <ul className="mt-4 space-y-2.5">
                    {event.outcomes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[0.9375rem] text-navy-700">
                        <Icon
                          name="check"
                          size={17}
                          className="mt-0.5 shrink-0 text-emerald-600"
                          strokeWidth={2.6}
                        />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {event.description && (
                <div className="mt-8">
                  <h2 className="text-h3">Tentang Kelas</h2>
                  {/* Paragraphs split on blank lines, so admins can write plain text */}
                  <div className="mt-3 space-y-3.5 text-[0.9375rem] leading-relaxed text-navy-600">
                    {event.description
                      .split(/\n\s*\n/)
                      .filter(Boolean)
                      .map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                  </div>
                </div>
              )}

              {event.mentorName && (
                <div className="mt-8">
                  <h2 className="text-h3">Mentor</h2>
                  <div className="card mt-3 flex items-center gap-4 p-5">
                    {/* Uploaded headshot when available, otherwise a coloured
                        monogram so the block never looks broken. */}
                    {event.mentorPhoto ? (
                      <Image
                        src={event.mentorPhoto}
                        alt={event.mentorName}
                        width={56}
                        height={56}
                        className="size-14 shrink-0 rounded-full object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="inline-flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white"
                        style={{ backgroundColor: event.bannerColor }}
                      >
                        {event.mentorName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-extrabold text-navy-900">{event.mentorName}</p>
                      {event.mentorTitle && (
                        <p className="text-sm text-navy-500">{event.mentorTitle}</p>
                      )}
                      {event.mentorLink && (
                        <a
                          href={event.mentorLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-gold-700 transition-colors hover:text-gold-800"
                        >
                          <Icon name="external" size={13} />
                          {event.mentorLinkLabel || "Lihat profil"}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Practical info */}
              <div className="mt-8">
                <h2 className="text-h3">Info Teknis</h2>
                {/*
                  Each wrapper div holds exactly one dt/dd pair. Nesting them
                  deeper, or putting the icon as their sibling, breaks the
                  definition-list structure that assistive tech relies on, so the
                  icon lives inside the dt instead.
                */}
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  {facts.map((f) => (
                    <div key={f.label} className="card p-4">
                      <dt className="flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-wide text-navy-400">
                        <Icon name={f.icon} size={16} className="text-navy-400" />
                        {f.label}
                      </dt>
                      <dd className="mt-1 pl-6 text-sm font-semibold text-navy-800">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* ---------- Sticky registration card ---------- */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="anim-pop card overflow-hidden shadow-lg">
                <div className="p-5 sm:p-6">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-navy-400">
                    Detail Event
                  </h2>

                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-navy-500">Tanggal</dt>
                      <dd className="text-right font-bold text-navy-900">
                        {fmtDateLong(event.startAt)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-navy-500">Waktu</dt>
                      <dd className="text-right font-bold text-navy-900">
                        {formatTimeRange(event.startAt, event.endAt)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-navy-500">Lokasi</dt>
                      <dd className="text-right font-bold text-navy-900">{location}</dd>
                    </div>
                    {!seats.isUnlimited && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-navy-500">Kuota</dt>
                        <dd className="text-right font-bold text-navy-900 tnum">
                          {seats.capacity} peserta
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/* Capacity meter */}
                  {!seats.isUnlimited && !registrationClosed && (
                    <div className="mt-4">
                      <div
                        className="h-2 overflow-hidden rounded-full bg-navy-100"
                        role="progressbar"
                        aria-valuenow={seats.percentFull}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Kuota terisi ${seats.percentFull} persen`}
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-700"
                          style={{
                            width: `${Math.max(4, seats.percentFull)}%`,
                            backgroundColor:
                              seats.scarcity === "critical" || seats.scarcity === "full"
                                ? "var(--color-coral-400)"
                                : seats.scarcity === "low"
                                  ? "var(--color-gold-400)"
                                  : "var(--color-emerald-500, #10b981)",
                          }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-navy-500 tnum">
                        {seats.isFull
                          ? "Kuota penuh - tersedia daftar tunggu"
                          : `Sisa ${seats.remaining} dari ${seats.capacity} kursi`}
                      </p>
                    </div>
                  )}

                  {/* Price */}
                  <div className="mt-5 border-t border-navy-100 pt-4">
                    <span className="block text-xs font-bold uppercase tracking-wide text-navy-400">
                      {isFree ? "Biaya" : "Investasi"}
                    </span>
                    <p
                      className={`text-3xl font-extrabold tnum ${
                        isFree ? "text-emerald-600" : "text-coral-600"
                      }`}
                    >
                      {formatPrice(event.price)}
                    </p>
                    {!isFree && (
                      <p className="mt-0.5 text-xs text-navy-400">
                        Sekali bayar, termasuk materi dan rekaman.
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-5">
                    {registrationClosed ? (
                      <>
                        <button type="button" className="btn btn-outline btn-lg w-full" disabled>
                          Pendaftaran Ditutup
                        </button>
                        <Link href="/event" className="btn btn-ghost btn-sm mt-2 w-full">
                          Lihat kelas lain
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href={`/event/${event.slug}/daftar`}
                          className={`btn btn-lg w-full ${
                            seats.isFull ? "btn-navy" : "btn-primary"
                          }`}
                        >
                          {seats.isFull ? "Gabung Daftar Tunggu" : "Daftar Sekarang"}
                          <Icon name="arrow-right" size={18} />
                        </Link>
                        <p className="mt-2.5 text-center text-xs text-navy-400">
                          Tanpa perlu bikin akun. Cukup 1 menit.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Add to calendar */}
                  {!isPast && (
                    <a
                      href={icsUrl}
                      download={`${event.slug}.ics`}
                      className="btn btn-outline btn-sm mt-3 w-full"
                    >
                      <Icon name="calendar" size={15} />
                      Tambah ke Kalender
                    </a>
                  )}
                </div>

                {/* Reassurance strip */}
                <ul className="grid gap-2 border-t border-navy-100 bg-surface px-5 py-4 text-xs text-navy-500 sm:px-6">
                  {[
                    "Konfirmasi otomatis ke email",
                    "Tiket QR untuk check-in",
                    "Materi dibagikan setelah sesi",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Icon
                        name="check"
                        size={14}
                        className="text-emerald-600"
                        strokeWidth={2.8}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Mobile sticky CTA: keeps the primary action reachable while scrolling */}
      {!registrationClosed && (
        <div className="no-print sticky bottom-0 z-30 border-t border-navy-100 bg-white/95 p-3 backdrop-blur-md lg:hidden">
          <div className="container-page flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-navy-400">
                {seats.isFull ? "Kuota penuh" : formatPrice(event.price)}
              </p>
              <p className="truncate text-sm font-extrabold text-navy-900">
                {event.title}
              </p>
            </div>
            <Link
              href={`/event/${event.slug}/daftar`}
              className={`btn btn-md shrink-0 ${seats.isFull ? "btn-navy" : "btn-primary"}`}
            >
              {seats.isFull ? "Waitlist" : "Daftar"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
