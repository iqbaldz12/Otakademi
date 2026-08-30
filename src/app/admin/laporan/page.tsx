import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Sparkline } from "@/components/admin/Sparkline";
import { StatCard } from "@/components/admin/StatCard";
import {
  getEventReport,
  getSourceBreakdown,
  getDashboardSummary,
  getRegistrationTrend,
} from "@/server/services/report.service";
import { listNotifications, TEMPLATE_LABEL } from "@/server/services/notification.service";
import { db } from "@/server/db";
import { EVENT_STATUS_META, type EventStatusName } from "@/lib/domain";
import { formatIDR, formatCompactIDR, fmtDateShort, fmtDateTimeShort } from "@/lib/format";

export const metadata: Metadata = { title: "Laporan" };
export const dynamic = "force-dynamic";

export default async function LaporanPage() {
  const [report, sources, summary, trend, notifications, auditLog] = await Promise.all([
    getEventReport(),
    getSourceBreakdown(),
    getDashboardSummary(),
    getRegistrationTrend(30),
    listNotifications(12),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  const totals = report.reduce(
    (acc, r) => ({
      registrations: acc.registrations + r.registrations,
      paid: acc.paid + r.paid,
      attended: acc.attended + r.attended,
      revenue: acc.revenue + r.revenue,
    }),
    { registrations: 0, paid: 0, attended: 0, revenue: 0 },
  );

  const avgTicket = totals.paid > 0 ? Math.round(totals.revenue / totals.paid) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2">Laporan</h1>
          <p className="mt-1 text-sm text-navy-500">
            Funnel dari pendaftaran sampai kehadiran.
          </p>
        </div>
        <a
          href="/api/reports/participants.csv"
          download
          className="btn btn-primary btn-md"
        >
          <Icon name="download" size={16} />
          Export Semua Peserta
        </a>
      </div>

      {/* ---------- Funnel KPIs ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Pendaftar"
          value={String(totals.registrations)}
          icon="users"
        />
        <StatCard
          label="Konversi ke Bayar"
          value={
            totals.registrations > 0
              ? `${Math.round((totals.paid / totals.registrations) * 100)}%`
              : "0%"
          }
          hint={`${totals.paid} transaksi lunas`}
          icon="trending"
          tone="green"
        />
        <StatCard
          label="Tingkat Kehadiran"
          value={`${summary.attendanceRate}%`}
          hint={`${totals.attended} peserta hadir`}
          icon="check-circle"
          tone="gold"
        />
        <StatCard
          label="Rata-rata Tiket"
          value={formatCompactIDR(avgTicket)}
          hint={formatIDR(totals.revenue) + " total"}
          icon="wallet"
          tone="coral"
        />
      </div>

      {/* ---------- Trend + sources ---------- */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h2 className="text-h3">Tren Pendaftaran (30 hari)</h2>
          <div className="mt-4">
            <Sparkline data={trend} height={80} />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-h3">Sumber Pendaftar</h2>
          {sources.length === 0 ? (
            <p className="mt-4 text-sm text-navy-400">Belum ada data sumber.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sources.slice(0, 6).map((s) => (
                <li key={s.source}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold text-navy-700">{s.source}</span>
                    <span className="font-bold text-navy-900 tnum">
                      {s.count}{" "}
                      <span className="text-xs font-normal text-navy-400">
                        ({s.percent}%)
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-100">
                    <div
                      className="h-full rounded-full bg-gold-400"
                      style={{ width: `${Math.max(2, s.percent)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ---------- Per-event table ---------- */}
      <div className="card overflow-hidden">
        <div className="border-b border-navy-100 p-5">
          <h2 className="text-h3">Performa per Event</h2>
        </div>

        {report.length === 0 ? (
          <p className="p-12 text-center text-sm text-navy-400">Belum ada event.</p>
        ) : (
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <caption className="sr-only-x">
                Performa setiap event: pendaftar, pembayaran, kehadiran, revenue
              </caption>
              <thead>
                <tr className="border-b border-navy-100 bg-surface text-left">
                  <th scope="col" className="px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Event
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Daftar
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Paid
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Konversi
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Hadir
                  </th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {report.map((r) => {
                  const meta = EVENT_STATUS_META[r.status as EventStatusName];
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-surface">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/event/${r.id}`}
                          className="font-bold text-navy-900 transition-colors hover:text-gold-700"
                        >
                          {r.title}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-navy-400">
                          {fmtDateShort(r.startAt)}
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-navy-800 tnum">
                        {r.registrations}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-600 tnum">
                        {r.paid}
                      </td>
                      <td className="px-4 py-3.5 text-right tnum">
                        <span
                          className={`font-bold ${
                            r.conversion >= 70
                              ? "text-emerald-600"
                              : r.conversion >= 40
                                ? "text-gold-700"
                                : "text-navy-400"
                          }`}
                        >
                          {r.price === 0 ? "-" : `${r.conversion}%`}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-navy-800 tnum">
                        {r.attended}
                      </td>
                      <td className="px-5 py-3.5 text-right font-extrabold text-navy-900 tnum">
                        {formatIDR(r.revenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy-200 bg-surface font-extrabold">
                  <td className="px-5 py-3.5 text-navy-900">Total</td>
                  <td className="px-4 py-3.5 text-right text-navy-900 tnum">
                    {totals.registrations}
                  </td>
                  <td className="px-4 py-3.5 text-right text-emerald-700 tnum">
                    {totals.paid}
                  </td>
                  <td className="px-4 py-3.5" />
                  <td className="px-4 py-3.5 text-right text-navy-900 tnum">
                    {totals.attended}
                  </td>
                  <td className="px-5 py-3.5 text-right text-navy-900 tnum">
                    {formatIDR(totals.revenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ---------- Logs ---------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-navy-100 p-5">
            <h2 className="text-h3">Antrean Notifikasi</h2>
            <p className="mt-0.5 text-xs text-navy-400">
              Outbox. Provider email dipasang saat implementasi.
            </p>
          </div>
          {notifications.length === 0 ? (
            <p className="p-8 text-center text-sm text-navy-400">Belum ada notifikasi.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy-800">
                      {TEMPLATE_LABEL[n.template as keyof typeof TEMPLATE_LABEL] ??
                        n.template}
                    </p>
                    <p className="truncate text-xs text-navy-400">{n.recipient}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={n.status === "SENT" ? "green" : "grey"}>{n.status}</Badge>
                    <p className="mt-0.5 text-[0.65rem] text-navy-400">
                      {fmtDateTimeShort(n.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-navy-100 p-5">
            <h2 className="text-h3">Riwayat Perubahan</h2>
            <p className="mt-0.5 text-xs text-navy-400">
              Jejak aksi admin untuk troubleshooting.
            </p>
          </div>
          {auditLog.length === 0 ? (
            <p className="p-8 text-center text-sm text-navy-400">Belum ada aktivitas.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {auditLog.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-xs font-bold text-navy-800">{a.action}</code>
                    <span className="shrink-0 text-[0.65rem] text-navy-400">
                      {fmtDateTimeShort(a.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-navy-400">
                    {a.actor}
                    {a.detail ? ` — ${a.detail}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
