import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { RegistrationForm } from "@/components/site/RegistrationForm";
import { getEventBySlug } from "@/server/services/event.service";
import { EVENT_FORMAT_META, type EventFormatName } from "@/lib/domain";
import { formatPrice, fmtDateLong, formatTimeRange } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  return {
    title: event ? `Daftar - ${event.title}` : "Pendaftaran",
    // A form page has no business appearing in search results.
    robots: { index: false, follow: true },
  };
}

/** Always fresh: seat availability decides whether this is a waitlist signup. */
export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) notFound();

  // Send people back to the detail page if registration isn't open.
  const isPast = event.startAt < new Date();
  if (event.status === "CLOSED" || event.status === "COMPLETED" || isPast) {
    redirect(`/event/${event.slug}`);
  }

  const { seats } = event;
  const format = EVENT_FORMAT_META[event.format as EventFormatName];
  const isWaitlist = seats.isFull;

  return (
    <section className="section bg-surface">
      <div className="container-page">
        <Link
          href={`/event/${event.slug}`}
          className="btn btn-ghost btn-sm mb-5 -ml-3"
        >
          <Icon name="arrow-left" size={16} />
          Kembali ke detail event
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-10">
          {/* ---------- Form ---------- */}
          <div className="card anim-enter p-5 sm:p-8">
            <h1 className="text-h2">
              {isWaitlist ? "Gabung Daftar Tunggu" : "Formulir Pendaftaran"}
            </h1>
            <p className="mt-2 text-navy-500">
              Isi data di bawah. Tidak perlu membuat akun.
            </p>

            <div className="mt-7">
              <RegistrationForm
                eventId={event.id}
                eventSlug={event.slug}
                price={event.price}
                isWaitlist={isWaitlist}
              />
            </div>
          </div>

          {/* ---------- Event recap ---------- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card overflow-hidden">
              <div
                className="h-2 w-full"
                style={{ backgroundColor: event.bannerColor }}
                aria-hidden="true"
              />
              <div className="p-5">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-navy-400">
                  Kamu mendaftar untuk
                </h2>
                <p className="mt-2 text-h3">{event.title}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="navy">{event.category}</Badge>
                  <Badge tone="grey">{format.label}</Badge>
                  {isWaitlist && <Badge tone="coral">Waitlist</Badge>}
                </div>

                {/* dt/dd stay direct children of one wrapper div per row, so the
                    definition list keeps a valid structure for screen readers. */}
                <dl className="mt-5 space-y-2.5 text-sm">
                  {(
                    [
                      { icon: "calendar", label: "Tanggal", value: fmtDateLong(event.startAt) },
                      {
                        icon: "clock",
                        label: "Waktu",
                        value: formatTimeRange(event.startAt, event.endAt),
                      },
                      ...(event.venue
                        ? [{ icon: "pin" as const, label: "Lokasi", value: event.venue }]
                        : []),
                      ...(event.mentorName
                        ? [{ icon: "users" as const, label: "Mentor", value: event.mentorName }]
                        : []),
                    ] as Array<{ icon: IconName; label: string; value: string }>
                  ).map((row) => (
                    <div key={row.label} className="flex items-start gap-2.5">
                      <dt className="sr-only-x">{row.label}</dt>
                      <dd className="flex items-start gap-2.5 font-semibold text-navy-800">
                        <Icon
                          name={row.icon}
                          size={16}
                          className="mt-0.5 shrink-0 text-navy-400"
                        />
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5 border-t border-navy-100 pt-4">
                  <span className="block text-xs font-bold uppercase tracking-wide text-navy-400">
                    Biaya
                  </span>
                  <p
                    className={`text-2xl font-extrabold tnum ${
                      event.price === 0 ? "text-emerald-600" : "text-coral-600"
                    }`}
                  >
                    {formatPrice(event.price)}
                  </p>
                </div>

                {/* What happens next: sets expectations before they submit */}
                <div className="mt-5 rounded-xl bg-surface p-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-navy-500">
                    Setelah daftar
                  </h3>
                  <ol className="mt-2.5 space-y-2 text-xs text-navy-600">
                    {(isWaitlist
                      ? [
                          "Kamu masuk daftar tunggu sesuai urutan.",
                          "Kami hubungi kalau ada kursi terbuka.",
                          "Tidak ada pembayaran sampai kursi tersedia.",
                        ]
                      : event.price > 0
                        ? [
                            "Kamu dapat kode pendaftaran dan instruksi bayar.",
                            "Setelah pembayaran dikonfirmasi, tiket QR diterbitkan.",
                            "Link dan pengingat dikirim sebelum acara.",
                          ]
                        : [
                            "Pendaftaran langsung terkonfirmasi.",
                            "Tiket QR terbit saat itu juga.",
                            "Link dan pengingat dikirim sebelum acara.",
                          ]
                    ).map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-navy-200 text-[0.6rem] font-extrabold text-navy-700">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
