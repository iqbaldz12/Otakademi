import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { ParticipantTable, type ParticipantRow } from "@/components/admin/ParticipantTable";
import { listRegistrations } from "@/server/services/registration.service";
import { db } from "@/server/db";
import {
  REGISTRATION_STATUS,
  REGISTRATION_STATUS_META,
  PAYMENT_STATUS,
  PAYMENT_STATUS_META,
} from "@/lib/domain";

export const metadata: Metadata = { title: "Pendaftar" };
export const dynamic = "force-dynamic";

type SearchParams = {
  eventId?: string;
  status?: string;
  paymentStatus?: string;
  q?: string;
};

/** Builds the CSV download URL, carrying the active filters over. */
function exportHref(params: SearchParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  return `/api/reports/participants.csv${qs.toString() ? `?${qs}` : ""}`;
}

export default async function PendaftarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const [registrations, events] = await Promise.all([
    listRegistrations({
      eventId: params.eventId,
      status: params.status,
      paymentStatus: params.paymentStatus,
      search: params.q,
    }),
    db.event.findMany({
      select: { id: true, title: true },
      orderBy: { startAt: "desc" },
    }),
  ]);

  // Map to plain serialisable rows: Date objects can't cross to a client
  // component, and the table only needs a subset of the record.
  const rows: ParticipantRow[] = registrations.map((r) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    source: r.source,
    promoCode: r.promoCode,
    createdAt: r.createdAt.toISOString(),
    checkInAt: r.ticket?.checkInAt ? r.ticket.checkInAt.toISOString() : null,
    participant: {
      name: r.participant.name,
      email: r.participant.email,
      phone: r.participant.phone,
      institution: r.participant.institution,
      city: r.participant.city,
    },
    event: { id: r.event.id, title: r.event.title },
    payment: r.payment ? { status: r.payment.status, amount: r.payment.amount } : null,
  }));

  const hasFilters = Boolean(
    params.eventId || params.status || params.paymentStatus || params.q,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2">Pendaftar</h1>
          <p className="mt-1 text-sm text-navy-500">
            {rows.length} data ditampilkan
            {rows.length === 500 && " (dibatasi 500 teratas)"}
          </p>
        </div>
        <a href={exportHref(params)} className="btn btn-primary btn-md" download>
          <Icon name="download" size={16} />
          Export CSV
        </a>
      </div>

      {/* Filters: a GET form keeps state in the URL and needs no JS */}
      <form action="/admin/pendaftar" method="get" className="card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="q" className="label">
              Cari
            </label>
            <div className="relative">
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300"
              />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={params.q ?? ""}
                placeholder="Nama, email, kode..."
                className="field pl-9"
              />
            </div>
          </div>

          <div>
            <label htmlFor="eventId" className="label">
              Event
            </label>
            <select
              id="eventId"
              name="eventId"
              defaultValue={params.eventId ?? ""}
              className="field field-select"
            >
              <option value="">Semua event</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="label">
              Status pendaftaran
            </label>
            <select
              id="status"
              name="status"
              defaultValue={params.status ?? ""}
              className="field field-select"
            >
              <option value="">Semua status</option>
              {REGISTRATION_STATUS.map((s) => (
                <option key={s} value={s}>
                  {REGISTRATION_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="paymentStatus" className="label">
              Status pembayaran
            </label>
            <select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={params.paymentStatus ?? ""}
              className="field field-select"
            >
              <option value="">Semua</option>
              {PAYMENT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {PAYMENT_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-navy-100 pt-3">
          <button type="submit" className="btn btn-navy btn-sm">
            <Icon name="filter" size={15} />
            Terapkan Filter
          </button>
          {hasFilters && (
            <Link href="/admin/pendaftar" className="btn btn-ghost btn-sm">
              <Icon name="x" size={15} />
              Reset
            </Link>
          )}
        </div>
      </form>

      <ParticipantTable rows={rows} />
    </div>
  );
}
