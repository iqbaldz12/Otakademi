import Link from "next/link";
import { Logo } from "@/components/site/Logo";
import { MobileNav } from "@/components/site/MobileNav";
import { Icon } from "@/components/ui/Icon";

const LINKS = [
  { href: "/event", label: "Kelas & Event" },
  { href: "/tentang", label: "Tentang" },
  { href: "/institusi", label: "Untuk Institusi" },
  { href: "/faq", label: "FAQ" },
];

/**
 * Site header. A server component apart from the mobile drawer.
 *
 * Sticky positioning with a translucent blur is done in CSS, so there's no
 * scroll listener and nothing runs on the main thread while scrolling.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/80 bg-white/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo height={32} priority />

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/event" className="btn btn-navy btn-sm hidden sm:inline-flex">
            Lihat Event
            <Icon name="arrow-right" size={16} />
          </Link>
          <MobileNav links={LINKS} />
        </div>
      </div>
    </header>
  );
}
