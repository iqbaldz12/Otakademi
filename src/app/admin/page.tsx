import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/admin/StatCard";
import { Sparkline } from "@/components/admin/Sparkline";
import { ActionButton } from "@/components/admin/ActionButton";
import { sendRemindersAction } from "@/server/actions/event.actions";
import { expirePaymentsAction } from "@/server/actions/ops.actions";
import {
  getDashboardSummary,
  getUpcomingEventStats,
  getRegistrationTrend,
} from "@/server/services/report.service";
import { EVENT_STATUS_META, type EventStatusName } from "@/lib/domain";
import { formatCompactIDR, formatNumber, fmtDateShort } from "@/lib/format";

/** Operational data must be current, never served from cache. */
export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;

  const [summary, upcoming, trend] = await Promise.all([
    getDashboardSummary(),
    getUpcomingEventStats(),
    getRegistrationTrend(14),
  ]);

  return (
    <div className="space-y-6">
      {denied && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-coral-200 bg-coral-50 p-4 text-sm font-semibold text-coral-800"
        >
          <Icon name="alert" size={18} />
          Role kamu tidak punya akses ke halaman itu.
        </div>
      )}

      {/* ---------- Header ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2">Dashboard Event</h1>
          <p className="mt-1 text-sm text-navy-500">
            Ringkasan operasional hari ini.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/event/baru" className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} />
            Buat Event
          </Link>
          <Link href="/admin/pendaftar" className="btn btn-outline btn-sm">
            <Icon name="download" size={15} />
            Export Peserta
          </Link>
        </div>
      </div>

      {/* ---------- KPIs ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Event Aktif"
          value={formatNumber(summary.activeEvents)}
          icon="calendar"
          hint="Dipublikasikan & terbuka"
        />
        <StatCard
          label="Pendaftar"
          value={formatNumber(summary.totalRegistrants)}
          icon="users"
          hint={`+${summary.todayRegistrations} hari ini`}
        />
        <StatCard
          label="Paid"
          value={formatNumber(summary.paidCount)}
          icon="check-circle"
          tone="green"
          hint={`+${summary.todayPaid} hari ini`}
        />
        <StatCard
          label="Revenue"
          value={formatCompactIDR(summary.revenue)}
          icon="wallet"
          tone="gold"
          hint="Total pembayaran lunas"
        />
      </div>

      {/* ---------- Needs attention + trend ---------- */}
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="card p-5">
          <h2 className="text-h3">Perlu Ditindak</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link
              href="/admin/pembayaran?status=PENDING"
              className="rounded-xl border border-gold-200 bg-gold-50 p-4 transition-colors hover:bg-gold-100"
            >
              <span className="block text-2xl font-extrabold text-gold-700 tnum">
                {summary.awaitingPayment}
              </span>
              <span className="text-xs font-semibold text-navy-600">
                Menunggu pembayaran
              </span>
            </Link>
            <Link
              href="/admin/pendaftar?status=WAITLIST"
              className="rounded-xl border border-navy-200 bg-navy-50 p-4 transition-colors hover:bg-navy-100"
            >
              <span className="block text-2xl font-extrabold text-navy-700 tnum">
                {summary.waitlistCount}
              </span>
              <span className="text-xs font-semibold text-navy-600">
                Di daftar tunggu
              </span>
            </Link>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <span className="block text-2xl font-extrabold text-emerald-700 tnum">
                {summary.attendanceRate}%
              </span>
              <span className="text-xs font-semibold text-navy-600">
                Tingkat kehadiran
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-navy-100 pt-4">
            <ActionButton
              action={expirePaymentsAction}
              icon="clock"
              pendingText="Merekonsiliasi..."
            >
              Rekonsiliasi Pembayaran
            </ActionButton>
            <Link href="/admin/checkin" className="btn btn-outline btn-sm">
              <Icon name="scan" size={15} />
              Buka Check-in
            </Link>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-h3">Tren Pendaftaran</h2>
          <div className="mt-4">
            <Sparkline data={trend} />
          </div>
          <dl className="mt-4 space-y-1.5 border-t border-navy-100 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-navy-500">Pendaftar hari ini</dt>
              <dd className="font-bold text-navy-900 tnum">
                {summary.todayRegistrations}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-navy-500">Pembayaran hari ini</dt>
              <dd className="font-bold text-navy-900 tnum">{summary.todayPaid}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ---------- Upcoming events ---------- */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 p-5">
          <h2 className="text-h3">Event Mendatang</h2>
          <Link href="/admin/event" className="btn btn-ghost btn-sm">
            Kelola semua
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Icon name="calendar" size={30} className="text-navy-200" />
            <p className="text-sm text-navy-500">Belum ada event mendatang.</p>
            <Link href="/admin/event/baru" className="btn btn-primary btn-sm">
              <Icon name="plus" size={15} />
              Buat Event Pertama
            </Link>
          </div>
        ) : (
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <caption className="sr-only-x">
                Daftar event mendatang beserta jumlah pendaftar dan status
              </caption>
              <thead>
                <tr className="border-b border-navy-100 bg-surface text-left">
                  <th scope="col" className="px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Event
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Tanggal
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Daftar
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Paid
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {upcoming.map((event) => {
                  const meta = EVENT_STATUS_META[event.status as EventStatusName];
                  return (
                    <tr key={event.id} className="transition-colors hover:bg-surface">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/event/${event.id}`}
                          className="font-bold text-navy-900 transition-colors hover:text-gold-700"
                        >
                          {event.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-navy-600">
                        {fmtDateShort(event.startAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-navy-800 tnum">
                        {event.registrations}
                        {event.capacity > 0 && (
                          <span className="font-normal text-navy-300">
                            /{event.capacity}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-600 tnum">
                        {event.paid}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <ActionButton
                            action={sendRemindersAction.bind(null, event.id)}
                            icon="bell"
                            size="sm"
                            variant="ghost"
                            pendingText="Mengirim..."
                          >
                            Ingatkan
                          </ActionButton>
                          <Link
                            href={`/admin/pendaftar?eventId=${event.id}`}
                            className="btn btn-outline btn-sm"
                          >
                            Peserta
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------- Today's activity ---------- */}
      <div className="card p-5">
        <h2 className="text-h3">Aktivitas Pendaftaran</h2>
        <p className="mt-2 text-sm text-navy-600">
          Hari ini:{" "}
          <strong className="tnum">{summary.todayRegistrations}</strong> pendaftar baru
          &middot; <strong className="tnum">{summary.todayPaid}</strong> pembayaran
          berhasil &middot;{" "}
          <strong className="tnum">{summary.awaitingPayment}</strong> menunggu pembayaran
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-4">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy-400">
            Quick action
          </span>
          <Link href="/admin/event/baru" className="btn btn-ghost btn-sm">
            <Icon name="plus" size={15} />
            Buat Event
          </Link>
          <Link href="/admin/pendaftar" className="btn btn-ghost btn-sm">
            <Icon name="download" size={15} />
            Export Peserta
          </Link>
          <Link href="/admin/laporan" className="btn btn-ghost btn-sm">
            <Icon name="chart" size={15} />
            Lihat Laporan
          </Link>
        </div>
      </div>
    </div>
  );
}
