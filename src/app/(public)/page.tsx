import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Accordion } from "@/components/ui/Accordion";
import { EventCard } from "@/components/site/EventCard";
import { listFeaturedEvents } from "@/server/services/event.service";
import { getDashboardSummary } from "@/server/services/report.service";
import { getLandingContent } from "@/server/services/content.service";
import { formatNumber } from "@/lib/format";
import { isContactIcon } from "@/lib/domain";

export const metadata: Metadata = {
  title: "Otakademi - Upgrade Skill. Upgrade Cara Mikir.",
  description:
    "Kelas dan event praktis untuk generasi muda yang ingin berpikir lebih jernih, punya skill relevan, dan lebih siap kerja.",
  alternates: { canonical: "/" },
};

/**
 * Landing page.
 *
 * Revalidated rather than rendered per request: the HTML is served from cache
 * and refreshed in the background, so first paint doesn't wait on Postgres.
 * Registration mutations call revalidatePath("/") to keep seat counts honest.
 */
export const revalidate = 120;

/** BENEFIT icon strings come from the CMS; fall back if one is unrecognised. */
function benefitIcon(name: string | null): IconName {
  return (name && isContactIcon(name) ? name : "sparkles") as IconName;
}

export default async function HomePage() {
  // Independent queries run together rather than in sequence.
  const [featured, stats, content] = await Promise.all([
    listFeaturedEvents(3),
    getDashboardSummary(),
    getLandingContent(),
  ]);

  const { copy, benefits, steps, testimonials, faqs } = content;

  // Only show social-proof numbers once they're actually meaningful.
  const showStats = stats.totalRegistrants >= 20;

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        {/* Decorative background blobs. aria-hidden + pointer-events-none so they
            never interfere with content or screen readers. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="anim-drift absolute -left-24 -top-28 size-[26rem] rounded-full bg-coral-100/55 blur-3xl" />
          <div
            className="anim-drift absolute -right-20 top-10 size-[22rem] rounded-full bg-gold-100/60 blur-3xl"
            style={{ animationDelay: "-7s" }}
          />
          <div
            className="anim-drift absolute bottom-0 left-1/3 size-[18rem] rounded-full bg-navy-100/50 blur-3xl"
            style={{ animationDelay: "-14s" }}
          />
        </div>

        <div className="container-page grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            {copy.heroBadge && (
              <div className="anim-enter">
                <Badge tone="coral" dot>
                  {copy.heroBadge}
                </Badge>
              </div>
            )}

            <h1 className="anim-enter d-1 mt-5 text-display">
              {copy.heroTitleLine1}
              {copy.heroTitleLine2 && (
                <>
                  <br />
                  <span className="text-gradient-brand">{copy.heroTitleLine2}</span>
                </>
              )}
            </h1>

            <p className="anim-enter d-2 mt-5 max-w-xl text-lead text-navy-500">
              {copy.heroSubtitle}
            </p>

            <div className="anim-enter d-3 mt-8 flex flex-wrap items-center gap-3">
              <Link href="/event" className="btn btn-primary btn-lg">
                {copy.heroPrimaryCta}
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link href="#cara-kerja" className="btn btn-outline btn-lg">
                Lihat Cara Kerjanya
              </Link>
            </div>

            {showStats && (
              <dl className="anim-enter d-4 mt-10 flex flex-wrap gap-x-8 gap-y-4">
                {[
                  { label: "Peserta terdaftar", value: formatNumber(stats.totalRegistrants) },
                  { label: "Kelas aktif", value: formatNumber(stats.activeEvents) },
                  { label: "Tingkat kehadiran", value: `${stats.attendanceRate}%` },
                ].map((s) => (
                  <div key={s.label}>
                    <dd className="text-2xl font-extrabold text-navy-900 tnum">{s.value}</dd>
                    <dt className="text-xs font-semibold text-navy-400">{s.label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Brand panel */}
          <div className="anim-pop d-2 relative">
            <div className="relative mx-auto flex max-w-md flex-col items-center justify-center rounded-[2rem] border border-navy-100 bg-gradient-to-br from-navy-50 via-white to-gold-50/70 px-8 py-12 shadow-lg">
              <div className="anim-float">
                <Image
                  src="/brand/logo.png"
                  alt="Otakademi"
                  width={280}
                  height={201}
                  priority
                  quality={90}
                  // Keeps the 480:344 logo ratio so the wordmark isn't clipped.
                  sizes="280px"
                  className="h-auto w-[16rem] drop-shadow-xl sm:w-[17.5rem]"
                />
              </div>

              <p className="mt-7 flex items-center gap-2.5 text-sm font-extrabold tracking-wide text-navy-700">
                <span>Learn</span>
                <span className="size-1.5 rounded-full bg-coral-400" aria-hidden="true" />
                <span>Think</span>
                <span className="size-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                <span>Try</span>
              </p>

              {/* Floating accents */}
              <span
                aria-hidden="true"
                className="anim-float absolute -left-3 top-10 rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs font-extrabold text-navy-700 shadow-md"
                style={{ animationDelay: "-2s" }}
              >
                Praktis
              </span>
              <span
                aria-hidden="true"
                className="anim-float absolute -right-3 bottom-16 rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs font-extrabold text-navy-700 shadow-md"
                style={{ animationDelay: "-4.5s" }}
              >
                Ada output
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURED EVENTS ================= */}
      <section className="section bg-surface" id="event-terdekat">
        <div className="container-page">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-h2">Event Terdekat</h2>
              <p className="mt-2 max-w-xl text-navy-500">
                Kelas yang paling dekat jadwalnya. Kuota terbatas supaya sesi tetap
                interaktif.
              </p>
            </div>
            <Link href="/event" className="btn btn-outline btn-md">
              Semua Event
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  reveal
                  delayClass={`d-${i + 1}`}
                />
              ))}
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
              <Icon name="calendar" size={34} className="text-navy-200" />
              <h3 className="text-h3">Belum ada event terjadwal</h3>
              <p className="max-w-sm text-sm text-navy-500">
                Kelas berikutnya sedang disiapkan. Tinggalkan emailmu supaya jadi yang
                pertama tahu.
              </p>
              <Link href="/kontak" className="btn btn-primary btn-md mt-1">
                Gabung Waitlist
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ================= BENEFITS ================= */}
      {benefits.length > 0 && (
        <section className="section">
          <div className="container-page">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-h2">{copy.benefitsTitle}</h2>
              {copy.benefitsSubtitle && (
                <p className="mt-3 text-navy-500">{copy.benefitsSubtitle}</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b, i) => (
                <div
                  key={b.id}
                  className={`card card-interactive reveal d-${(i % 4) + 1} p-6`}
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
                    <Icon name={benefitIcon(b.icon)} size={21} />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-500">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= HOW IT WORKS ================= */}
      {steps.length > 0 && (
        <section className="section bg-navy-900 text-white" id="cara-kerja">
          <div className="container-page">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-h2 text-white">{copy.stepsTitle}</h2>
              {copy.stepsSubtitle && (
                <p className="mt-3 text-navy-200">{copy.stepsSubtitle}</p>
              )}
            </div>

            <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li
                  key={step.id}
                  className={`reveal d-${(i % 4) + 1} relative rounded-[--radius-card] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm`}
                >
                  <span className="text-2xl font-extrabold text-gold-400 tnum">
                    {step.icon || String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-base font-extrabold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-200">
                    {step.body}
                  </p>

                  {/* Connector line between steps on wide screens */}
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-3 top-1/2 hidden h-px w-6 bg-white/20 lg:block"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ================= TESTIMONIALS ================= */}
      {testimonials.length > 0 && (
        <section className="section bg-surface">
          <div className="container-page">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-h2">{copy.testimonialsTitle}</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <figure key={t.id} className={`card reveal d-${(i % 3) + 1} flex flex-col p-6`}>
                  <Icon name="quote" size={26} className="text-gold-300" />
                  <blockquote className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-navy-700">
                    {t.body}
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-navy-100 pt-4">
                    <span
                      aria-hidden="true"
                      className="inline-flex size-9 items-center justify-center rounded-full bg-coral-100 text-sm font-extrabold text-coral-700"
                    >
                      {t.title.charAt(0)}
                    </span>
                    <span>
                      <span className="block text-sm font-extrabold text-navy-900">
                        {t.title}
                      </span>
                      {t.meta && (
                        <span className="block text-xs text-navy-400">{t.meta}</span>
                      )}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= FAQ ================= */}
      {faqs.length > 0 && (
        <section className="section">
          <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-h2">{copy.faqTitle}</h2>
              <p className="mt-3 text-navy-500">
                Masih ada yang belum jelas? Tim kami balas cepat lewat WhatsApp.
              </p>
              <Link href="/kontak" className="btn btn-outline btn-md mt-5">
                <Icon name="whatsapp" size={16} />
                Tanya Tim Kami
              </Link>
            </div>
            <Accordion
              items={faqs.map((f) => ({ q: f.title, a: f.body }))}
              name="home-faq"
            />
          </div>
        </section>
      )}

      {/* ================= CTA ================= */}
      <section className="section pt-0">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-coral-400 via-coral-500 to-gold-400 px-6 py-14 text-center shadow-xl sm:px-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, white 0, transparent 45%), radial-gradient(circle at 80% 70%, white 0, transparent 40%)",
              }}
            />
            <div className="relative">
              <h2 className="text-h1 text-white">{copy.ctaTitle}</h2>
              <p className="mx-auto mt-4 max-w-lg text-white/90">{copy.ctaSubtitle}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/event" className="btn btn-navy btn-lg">
                  Lihat Semua Kelas
                  <Icon name="arrow-right" size={18} />
                </Link>
                <Link
                  href="/institusi"
                  className="btn btn-lg border-white/70 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
                >
                  Untuk Institusi
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
