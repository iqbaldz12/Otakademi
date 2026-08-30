"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

/**
 * Mobile navigation drawer.
 *
 * The only client component in the header, so desktop users download almost no
 * JS for navigation. Closes on route change, locks background scroll while open,
 * and supports Escape.
 */
export function MobileNav({
  links,
}: {
  links: Array<{ href: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    // Prevent the page behind the drawer from scrolling.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        aria-expanded={open}
        className="btn btn-ghost btn-sm -mr-2 md:hidden"
      >
        <Icon name="menu" size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="anim-fade absolute inset-0 bg-navy-950/45 backdrop-blur-sm"
          />

          {/* Panel */}
          <nav
            aria-label="Menu utama"
            className="absolute inset-y-0 right-0 flex w-[min(19rem,85vw)] flex-col gap-1 bg-white p-5 shadow-xl"
            style={{ animation: "reveal-up .3s var(--ease-out-expo) both" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-extrabold text-navy-400">MENU</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="btn btn-ghost btn-sm"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-3.5 py-3 text-[0.95rem] font-bold transition-colors ${
                    active
                      ? "bg-gold-50 text-gold-700"
                      : "text-navy-700 hover:bg-navy-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <Link href="/event" className="btn btn-primary btn-md mt-4">
              Lihat Event
              <Icon name="arrow-right" size={17} />
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
