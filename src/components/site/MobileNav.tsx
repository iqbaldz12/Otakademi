"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  // Portals need document.body, which only exists on the client. Gate the
  // portal render on mount so SSR and the first client render match.
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

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

      {/*
        Rendered through a portal onto <body>. The site header uses
        `backdrop-blur` + `sticky`, and an ancestor with backdrop-filter becomes
        the containing block for `position: fixed` descendants. Left inside the
        header, the drawer was clipped to the 64px header box and painted over
        page content, which read as "transparent". Portaling to <body> escapes
        that containing block so the overlay covers the whole viewport.
      */}
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[100] md:hidden">
            {/* Backdrop */}
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setOpen(false)}
              className="anim-fade absolute inset-0 bg-navy-950/60"
            />

            {/*
              Solid navy panel matching the admin sidebar. The background colour
              is set inline too, so it can never be softened by a utility. Only
              the panel slides in; opacity is not animated so it can never render
              see-through mid-transition.
            */}
            <nav
              aria-label="Menu utama"
              className="absolute inset-y-0 right-0 flex w-[min(19rem,85vw)] flex-col gap-1 p-5 shadow-xl"
              style={{
                backgroundColor: "var(--color-navy-900)",
                animation: "slide-in-right .28s var(--ease-out-expo) both",
              }}
            >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-extrabold text-navy-300">MENU</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/10"
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
                      ? "bg-white/12 text-white"
                      : "text-navy-200 hover:bg-white/[0.07] hover:text-white"
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
          </div>,
          document.body,
        )}
    </>
  );
}
