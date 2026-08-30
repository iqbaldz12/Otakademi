import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/ui/Icon";
import {
  listPublicChannels,
  getContactContent,
} from "@/server/services/content.service";
import { isContactIcon, CONTACT_DEFAULTS } from "@/lib/domain";

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description:
    "Kanal bantuan Otakademi untuk pertanyaan event, pembayaran, atau kerja sama institusi.",
  alternates: { canonical: "/kontak" },
};

/**
 * Contact page.
 *
 * Content now comes from the CMS (ContactChannel + SiteSetting), so the team can
 * edit it from /admin/konten. Revalidated on a short interval and explicitly
 * refreshed by the content actions, so edits appear quickly without making the
 * page fully dynamic.
 */
export const revalidate = 300;

function iconFor(name: string): IconName {
  return (isContactIcon(name) ? name : "info") as IconName;
}

export default async function KontakPage() {
  // Fall back to defaults if the database is unreachable (e.g. during a
  // container image build); the page then hydrates with real data at runtime.
  const [channels, content] = await Promise.all([
    listPublicChannels().catch(() => []),
    getContactContent().catch(() => ({
      heroTitle: CONTACT_DEFAULTS.heroTitle,
      heroSubtitle: CONTACT_DEFAULTS.heroSubtitle,
      hoursTitle: CONTACT_DEFAULTS.hoursTitle,
      hoursBody: CONTACT_DEFAULTS.hoursBody,
      topics: CONTACT_DEFAULTS.topics,
    })),
  ]);

  return (
    <>
      <section className="border-b border-navy-100 bg-surface">
        <div className="container-page py-12">
          <h1 className="text-h1">{content.heroTitle}</h1>
          {content.heroSubtitle && (
            <p className="mt-3 max-w-2xl text-lead text-navy-500">
              {content.heroSubtitle}
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          {channels.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {channels.map((c, i) => {
                const external = c.href.startsWith("http");
                return (
                  <a
                    key={c.id}
                    href={c.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className={`card card-interactive reveal d-${(i % 6) + 1} group flex flex-col p-6 ${
                      c.primary ? "border-emerald-200 bg-emerald-50/50" : ""
                    }`}
                  >
                    <span
                      className={`inline-flex size-11 items-center justify-center rounded-xl ${
                        c.primary
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-navy-50 text-navy-600"
                      }`}
                    >
                      <Icon name={iconFor(c.icon)} size={21} />
                    </span>
                    <h2 className="mt-4 text-base font-extrabold">{c.label}</h2>
                    <p className="mt-1 font-bold text-navy-800">{c.value}</p>
                    {c.note && (
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-navy-500">
                        {c.note}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-gold-700">
                      Buka
                      <Icon
                        name="arrow-right"
                        size={15}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </a>
                );
              })}
            </div>
          )}

          {content.topics.length > 0 && (
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {content.topics.map((t, i) => (
                <div key={i} className="card p-5">
                  <h2 className="text-base font-extrabold">{t.title}</h2>
                  {t.body && (
                    <p className="mt-2 text-sm leading-relaxed text-navy-500">
                      {t.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {content.hoursBody && (
            <div className="mt-10 rounded-[--radius-card] border border-navy-100 bg-surface p-6">
              <h2 className="flex items-center gap-2 text-base font-extrabold">
                <Icon name="info" size={18} className="text-navy-400" />
                {content.hoursTitle}
              </h2>
              <p className="mt-2 text-sm text-navy-600">{content.hoursBody}</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
