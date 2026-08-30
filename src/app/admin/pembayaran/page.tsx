import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/admin/ActionButton";
import { confirmPaymentAction, expirePaymentsAction } from "@/server/actions/ops.actions";
import { listPayments } from "@/server/services/payment.service";
import { db } from "@/server/db";
import { PAYMENT_STATUS, PAYMENT_STATUS_META, type PaymentStatusName } from "@/lib/domain";
import { formatIDR, fmtDateTimeShort, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Pembayaran" };
export const dynamic = "force-dynamic";

export default async function PembayaranPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const [payments, totals] = await Promise.all([
    listPayments({ status }),
    db.payment.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const paidTotal = totals.find((t) => t.status === "PAID");
  const pendingTotal = totals.find((t) => t.status === "PENDING");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2">Pembayaran</h1>
          <p className="mt-1 text-sm text-navy-500">
            Pantau, konfirmasi manual, dan rekonsiliasi transaksi.
          </p>
        </div>
        <ActionButton
          action={expirePaymentsAction}
          icon="clock"
          variant="outline"
          size="md"
          pendingText="Merekonsiliasi..."
        >
          Rekonsiliasi Kedaluwarsa
        </ActionButton>
      </div>

      {/* Money summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold text-navy-400">Total Lunas</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600 tnum">
            {formatIDR(paidTotal?._sum.amount ?? 0)}
          </p>
          <p className="text-[0.7rem] text-navy-400">
            {paidTotal?._count._all ?? 0} transaksi
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-navy-400">Menunggu Pembayaran</p>
          <p className="mt-1 text-2xl font-extrabold text-gold-700 tnum">
            {formatIDR(pendingTotal?._sum.amount ?? 0)}
          </p>
          <p className="text-[0.7rem] text-navy-400">
            {pendingTotal?._count._all ?? 0} transaksi
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-navy-400">Semua Transaksi</p>
          <p className="mt-1 text-2xl font-extrabold text-navy-900 tnum">
            {totals.reduce((s, t) => s + t._count._all, 0)}
          </p>
          <p className="text-[0.7rem] text-navy-400">Termasuk gagal & refund</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href="/admin/pembayaran"
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
            !status ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-600 hover:bg-navy-100"
          }`}
        >
          Semua
        </Link>
        {PAYMENT_STATUS.map((s) => (
          <Link
            key={s}
            href={`/admin/pembayaran?status=${s}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              status === s
                ? "bg-navy-800 text-white"
                : "bg-navy-50 text-navy-600 hover:bg-navy-100"
            }`}
          >
            {PAYMENT_STATUS_META[s].label}
          </Link>
        ))}
      </div>

      {payments.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-14 text-center">
          <Icon name="wallet" size={34} className="text-navy-200" />
          <h2 className="text-h3">Tidak ada transaksi</h2>
          <p className="text-sm text-navy-500">
            Belum ada pembayaran yang cocok dengan filter ini.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[58rem] text-sm">
              <caption className="sr-only-x">Daftar transaksi pembayaran</caption>
              <thead>
                <tr className="border-b border-navy-100 bg-surface text-left">
                  <th scope="col" className="px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Peserta
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Event
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Nominal
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Waktu
                  </th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {payments.map((p) => {
                  const meta = PAYMENT_STATUS_META[p.status as PaymentStatusName];
                  const canConfirm = p.status === "PENDING" || p.status === "UNPAID";

                  return (
                    <tr key={p.id} className="transition-colors hover:bg-surface">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-navy-900">
                          {p.registration.participant.name}
                        </p>
                        <p className="text-xs text-navy-400">
                          {p.registration.participant.email}
                        </p>
                        <Link
                          href={`/tiket/${p.registration.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-block font-mono text-[0.7rem] font-bold text-navy-600 underline decoration-navy-200"
                        >
                          {p.registration.code}
                        </Link>
                      </td>

                      <td className="max-w-[12rem] px-4 py-3.5">
                        <p className="line-2 text-navy-700">{p.registration.event.title}</p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-extrabold text-navy-900 tnum">
                        {formatIDR(p.amount)}
                        {p.method && (
                          <span className="block text-[0.65rem] font-normal text-navy-400">
                            {p.method}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-navy-500">
                        {p.paidAt ? (
                          <>
                            <span className="block font-semibold text-emerald-600">
                              Lunas
                            </span>
                            {fmtDateTimeShort(p.paidAt)}
                          </>
                        ) : p.expiresAt ? (
                          <>
                            <span className="block font-semibold">Batas waktu</span>
                            {fmtDateTimeShort(p.expiresAt)}
                            <span className="block text-[0.65rem] text-navy-400">
                              {formatRelative(p.expiresAt)}
                            </span>
                          </>
                        ) : (
                          fmtDateTimeShort(p.createdAt)
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {canConfirm ? (
                          <ActionButton
                            action={confirmPaymentAction.bind(null, p.id)}
                            icon="check"
                            variant="primary"
                            pendingText="Memproses..."
                          >
                            Konfirmasi
                          </ActionButton>
                        ) : (
                          <span className="text-xs text-navy-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
