"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/toast";
import {
  setRegistrationStatusAction,
  bulkStatusAction,
} from "@/server/actions/registration.actions";
import {
  REGISTRATION_STATUS_META,
  PAYMENT_STATUS_META,
  REGISTRATION_STATUS,
  type RegistrationStatusName,
  type PaymentStatusName,
} from "@/lib/domain";
import type { RegistrationStatus } from "@prisma/client";

export type ParticipantRow = {
  id: string;
  code: string;
  status: string;
  source: string | null;
  promoCode: string | null;
  createdAt: string;
  checkInAt: string | null;
  participant: {
    name: string;
    email: string;
    phone: string;
    institution: string | null;
    city: string | null;
  };
  event: { id: string; title: string };
  payment: { status: string; amount: number } | null;
};

/**
 * Participant CRM table with selection and bulk actions.
 *
 * Selection state is local (it's ephemeral UI, not something to put in the URL),
 * while filtering stays in the URL via the surrounding server component. Bulk
 * mutations go through a server action and the page revalidates itself.
 */
export function ParticipantTable({ rows }: { rows: ParticipantRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  const selectedIds = useMemo(() => [...selected], [selected]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function runBulk(status: RegistrationStatus) {
    startTransition(async () => {
      const result = await bulkStatusAction(selectedIds, status);
      toast(result.reason ?? "Selesai.", result.ok ? "success" : "error");
      if (result.ok) setSelected(new Set());
    });
  }

  function changeStatus(id: string, status: RegistrationStatus) {
    startTransition(async () => {
      const result = await setRegistrationStatusAction(id, status);
      toast(result.reason ?? "Selesai.", result.ok ? "success" : "error");
    });
  }

  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-14 text-center">
        <Icon name="users" size={34} className="text-navy-200" />
        <h2 className="text-h3">Belum ada pendaftar</h2>
        <p className="max-w-sm text-sm text-navy-500">
          Coba ubah filter, atau tunggu pendaftaran pertama masuk.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Bulk action bar, only present when something is selected */}
      {selected.size > 0 && (
        <div className="anim-fade sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-navy-800 bg-navy-800 p-3 shadow-lg">
          <span className="px-1 text-sm font-bold text-white tnum">
            {selected.size} dipilih
          </span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {(
              [
                { status: "CONFIRMED", label: "Konfirmasi" },
                { status: "ATTENDED", label: "Tandai Hadir" },
                { status: "NO_SHOW", label: "Tidak Hadir" },
                { status: "CANCELLED", label: "Batalkan" },
              ] as const
            ).map((action) => (
              <button
                key={action.status}
                type="button"
                onClick={() => runBulk(action.status)}
                disabled={isPending}
                className="rounded-lg bg-white/12 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/25 disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg px-2 py-1.5 text-xs font-bold text-navy-200 transition-colors hover:text-white"
            >
              Batal pilih
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[64rem] text-sm">
            <caption className="sr-only-x">
              Daftar pendaftar dengan status pendaftaran dan pembayaran
            </caption>
            <thead>
              <tr className="border-b border-navy-100 bg-surface text-left">
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      // Indeterminate can only be set imperatively.
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Pilih semua pendaftar"
                    className="size-4 accent-gold-500"
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                  Peserta
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                  Event
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                  Kode
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                  Bayar
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                  Ubah Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {rows.map((row) => {
                const statusMeta =
                  REGISTRATION_STATUS_META[row.status as RegistrationStatusName];
                const payMeta = row.payment
                  ? PAYMENT_STATUS_META[row.payment.status as PaymentStatusName]
                  : null;
                const isSelected = selected.has(row.id);

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isSelected ? "bg-gold-50/70" : "hover:bg-surface"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Pilih ${row.participant.name}`}
                        className="size-4 accent-gold-500"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold text-navy-900">{row.participant.name}</p>
                      <p className="text-xs text-navy-400">{row.participant.email}</p>
                      <p className="text-xs text-navy-400">
                        {row.participant.phone}
                        {row.participant.city ? ` · ${row.participant.city}` : ""}
                      </p>
                    </td>

                    <td className="max-w-[13rem] px-4 py-3">
                      <p className="line-2 text-navy-700">{row.event.title}</p>
                      {row.source && (
                        <p className="mt-0.5 text-xs text-navy-400">via {row.source}</p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <Link
                        href={`/tiket/${row.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-bold text-navy-700 underline decoration-navy-200 transition-colors hover:text-gold-700"
                      >
                        {row.code}
                      </Link>
                      {row.checkInAt && (
                        <span className="mt-1 flex items-center gap-1 text-[0.65rem] font-bold text-emerald-600">
                          <Icon name="check" size={11} strokeWidth={3} />
                          Check-in
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </td>

                    <td className="px-4 py-3">
                      {payMeta ? (
                        <>
                          <Badge tone={payMeta.tone}>{payMeta.label}</Badge>
                          <p className="mt-1 text-xs text-navy-400 tnum">
                            {row.payment!.amount.toLocaleString("id-ID")}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-navy-300">Gratis</span>
                      )}
                      {row.promoCode && (
                        <p className="mt-0.5 text-[0.65rem] font-bold text-gold-700">
                          {row.promoCode}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <label className="sr-only-x" htmlFor={`status-${row.id}`}>
                        Ubah status {row.participant.name}
                      </label>
                      <select
                        id={`status-${row.id}`}
                        value={row.status}
                        disabled={isPending}
                        onChange={(e) =>
                          changeStatus(row.id, e.target.value as RegistrationStatus)
                        }
                        className="field field-select py-1.5 text-xs"
                      >
                        {REGISTRATION_STATUS.map((s) => (
                          <option key={s} value={s}>
                            {REGISTRATION_STATUS_META[s].label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
