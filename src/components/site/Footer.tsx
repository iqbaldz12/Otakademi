import Link from "next/link";
import { Logo } from "@/components/site/Logo";
import { Icon, type IconName } from "@/components/ui/Icon";
import { listPublicChannels } from "@/server/services/content.service";
import { isContactIcon } from "@/lib/domain";

const COLUMNS = [
  {
    title: "Jelajahi",
    links: [
      { href: "/event", label: "Semua Kelas & Event" },
      { href: "/event?when=free", label: "Event Gratis" },
      { href: "/tentang", label: "Tentang Otakademi" },
      { href: "/institusi", label: "Untuk Institusi" },
    ],
  },
  {
    title: "Bantuan",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/kontak", label: "Hubungi Kami" },
      { href: "/cek-tiket", label: "Cek Tiket Saya" },
    ],
  },
  {
    title: "Kebijakan",
    links: [
      { href: "/kebijakan/privasi", label: "Kebijakan Privasi" },
      { href: "/kebijakan/ketentuan", label: "Syarat & Ketentuan" },
      { href: "/kebijakan/refund", label: "Refund & Pembatalan" },
      { href: "/kebijakan/kode-etik", label: "Kode Etik" },
    ],
  },
];

function iconFor(name: string): IconName {
  return (isContactIcon(name) ? name : "info") as IconName;
}

/**
 * Site footer. An async server component so its quick-contact buttons come from
 * the same CMS channels as /kontak: editing a channel in the admin updates the
 * footer too. Shows at most the first two active channels to stay compact.
 */
export async function Footer() {
  const channels = (await listPublicChannels()).slice(0, 2);

  return (
    <footer className="no-print mt-auto border-t border-navy-100 bg-surface">
      <div className="container-page py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo height={36} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-500">
              Kelas dan event praktis untuk generasi muda yang ingin berpikir lebih
              jernih, punya skill relevan, dan lebih siap.
            </p>
            {channels.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {channels.map((c) => {
                  const external = c.href.startsWith("http");
                  return (
                    <a
                      key={c.id}
                      href={c.href}
                      className="btn btn-outline btn-sm"
                      aria-label={`${c.label}: ${c.value}`}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                    >
                      <Icon name={iconFor(c.icon)} size={15} />
                      {c.label}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-navy-400">
                {col.title}
              </h2>
              <ul className="mt-3.5 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-navy-600 transition-colors hover:text-gold-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-navy-100 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-navy-400">
            &copy; {new Date().getFullYear()} Otakademi. Learn &middot; Think &middot; Try.
          </p>
          <Link
            href="/admin"
            className="text-xs font-semibold text-navy-400 transition-colors hover:text-navy-700"
          >
            Masuk Dashboard Tim
          </Link>
        </div>
      </div>
    </footer>
  );
}
