"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { logoutAction } from "@/server/actions/ops.actions";

const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/admin", label: "Dashboard", icon: "layout" },
  { href: "/admin/event", label: "Event", icon: "calendar" },
  { href: "/admin/pendaftar", label: "Pendaftar", icon: "users" },
  { href: "/admin/pembayaran", label: "Pembayaran", icon: "wallet" },
  { href: "/admin/checkin", label: "Check-in", icon: "scan" },
  { href: "/admin/promo", label: "Promo", icon: "sparkles" },
  { href: "/admin/konten", label: "Konten", icon: "edit" },
  { href: "/admin/laporan", label: "Laporan", icon: "chart" },
];

/**
 * Admin navigation.
 *
 * A client component because it highlights the active route and manages the
 * mobile drawer. Kept to just the nav so the data-heavy pages around it stay
 * server-rendered.
 */
export function AdminSidebar({
  user,
}: {
  user: { name: string; email: string; role: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const nav = (
    <nav aria-label="Navigasi dashboard" className="flex flex-1 flex-col gap-0.5">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-white/12 text-white"
                : "text-navy-200 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
            {active && (
              <span
                aria-hidden="true"
                className="ml-auto h-4 w-1 rounded-full bg-gold-400"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 pt-4">
      <div className="mb-3 px-1">
        <p className="truncate text-sm font-bold text-white">{user.name}</p>
        <p className="truncate text-xs text-navy-300">{user.email}</p>
        <span className="mt-1.5 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-bold text-gold-300">
          {user.role.replace("_", " ")}
        </span>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-navy-200 transition-colors hover:bg-coral-500/20 hover:text-white"
        >
          <Icon name="logout" size={18} />
          Keluar
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* ---------- Mobile top bar ---------- */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-white/10 bg-navy-900 px-4 lg:hidden">
        <Link href="/admin" aria-label="Otakademi - Dashboard" className="flex items-center gap-2">
          <Image src="/brand/mark.png" alt="" width={28} height={28} className="size-7" />
          <span className="font-extrabold tracking-tight text-white">Otakademi</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu dashboard"
          aria-expanded={open}
          className="rounded-lg p-2 text-white transition-colors hover:bg-white/10"
        >
          <Icon name="menu" size={21} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="anim-fade absolute inset-0 bg-black/50"
          />
          <div
            className="absolute inset-y-0 left-0 flex w-64 flex-col bg-navy-900 p-4"
            style={{ animation: "reveal-up .28s var(--ease-out-expo) both" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Image src="/brand/mark.png" alt="" width={28} height={28} className="size-7" />
                <span className="font-extrabold tracking-tight text-white">Otakademi</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/10"
              >
                <Icon name="x" size={19} />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      )}

      {/* ---------- Desktop rail ---------- */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy-900 p-4 lg:flex">
        <Link
          href="/admin"
          aria-label="Otakademi - Dashboard"
          className="mb-6 flex items-center gap-2.5 px-1 transition-opacity hover:opacity-80"
        >
          <Image
            src="/brand/mark.png"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0"
          />
          <span className="text-lg font-extrabold tracking-tight text-white">
            Otakademi
          </span>
        </Link>
        {nav}
        {footer}
      </aside>
    </>
  );
}
