import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { EventRowActions } from "@/components/admin/EventRowActions";
import { listAllEvents } from "@/server/services/event.service";
import {
  EVENT_STATUS_META,
  EVENT_FORMAT_META,
  type EventStatusName,
  type EventFormatName,
} from "@/lib/domain";
import { formatPrice, fmtDateShort, fmtTime } from "@/lib/format";

export const metadata: Metadata = { title: "Kelola Event" };
export const dynamic = "force-dynamic";

export default async function AdminEventListPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const events = await listAllEvents();

  const now = new Date();
  const live = events.filter(
    (e) => e.status === "PUBLISHED" || e.status === "SOLD_OUT",
  );
  const drafts = events.filter((e) => e.status === "DRAFT");

  return (
    <div className="space-y-6">
      {saved && (
        <div
          role="status"
          className="anim-fade flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
        >
          <Icon name="check-circle" size={18} />
          Event berhasil disimpan.
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2">Kelola Event</h1>
          <p className="mt-1 text-sm text-navy-500">
            {events.length} event total &middot; {live.length} aktif &middot;{" "}
            {drafts.length} draft
          </p>
        </div>
        <Link href="/admin/event/baru" className="btn btn-primary btn-md">
          <Icon name="plus" size={16} />
          Buat Event
        </Link>
      </div>

      {/* Explains what the switch actually does, so non-technical team members
          aren't guessing. */}
      <div className="flex items-start gap-2.5 rounded-xl border border-navy-200 bg-navy-50 p-4 text-sm text-navy-700">
        <Icon name="info" size={17} className="mt-px shrink-0 text-navy-500" />
        <p>
          Toggle <strong>Aktif</strong> menampilkan event di halaman publik dan
          membuka pendaftaran. <strong>Non-aktif</strong> menyembunyikan event
          sepenuhnya: hilang dari daftar kelas dan link-nya tidak bisa dibuka.
          Data pendaftar tetap aman.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-14 text-center">
          <Icon name="calendar" size={34} className="text-navy-200" />
          <h2 className="text-h3">Belum ada event</h2>
          <p className="max-w-sm text-sm text-navy-500">
            Buat event pertama kamu. Simpan sebagai draft dulu kalau detailnya belum
            final.
          </p>
          <Link href="/admin/event/baru" className="btn btn-primary btn-md mt-1">
            <Icon name="plus" size={16} />
            Buat Event
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[62rem] text-sm">
              <caption className="sr-only-x">
                Daftar semua event dengan kontrol aktif, edit, dan hapus
              </caption>
              <thead>
                <tr className="border-b border-navy-100 bg-surface text-left">
                  <th scope="col" className="px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Event
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Jadwal
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Harga
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Kuota
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
                {events.map((event) => {
                  const meta = EVENT_STATUS_META[event.status as EventStatusName];
                  const format = EVENT_FORMAT_META[event.format as EventFormatName];
                  const isPast = event.startAt < now;
                  const { seats } = event;

                  return (
                    <tr key={event.id} className="align-middle transition-colors hover:bg-surface">
                      {/* Event */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span
                            aria-hidden="true"
                            className="mt-1 h-9 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: event.bannerColor }}
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/admin/event/${event.id}`}
                              className="font-bold text-navy-900 transition-colors hover:text-gold-700"
                            >
                              {event.title}
                            </Link>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-navy-400">
                              <span>{event.category}</span>
                              <span aria-hidden="true">&middot;</span>
                              <span>{format.label}</span>
                              {event.mentorName && (
                                <>
                                  <span aria-hidden="true">&middot;</span>
                                  <span>{event.mentorName}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="font-semibold text-navy-800">
                          {fmtDateShort(event.startAt)}
                        </span>
                        <span className="block text-xs text-navy-400">
                          {fmtTime(event.startAt)} WIB
                        </span>
                        {isPast && (
                          <span className="mt-1 inline-block text-[0.65rem] font-bold text-navy-300">
                            SUDAH LEWAT
                          </span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`font-bold tnum ${
                            event.price === 0 ? "text-emerald-600" : "text-navy-800"
                          }`}
                        >
                          {formatPrice(event.price)}
                        </span>
                      </td>

                      {/* Capacity */}
                      <td className="whitespace-nowrap px-4 py-4">
                        {seats.isUnlimited ? (
                          <span className="text-xs font-semibold text-navy-400">
                            Tanpa batas
                          </span>
                        ) : (
                          <div className="min-w-[5.5rem]">
                            <span className="text-xs font-bold text-navy-700 tnum">
                              {seats.taken}/{seats.capacity}
                            </span>
                            <div
                              className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-100"
                              role="progressbar"
                              aria-valuenow={seats.percentFull}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`Kuota terisi ${seats.percentFull} persen`}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(4, seats.percentFull)}%`,
                                  backgroundColor:
                                    seats.percentFull >= 90
                                      ? "var(--color-coral-400)"
                                      : seats.percentFull >= 70
                                        ? "var(--color-gold-400)"
                                        : "var(--color-navy-300)",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>

                      {/* Actions: switch + edit + delete */}
                      <td className="px-5 py-4">
                        <EventRowActions
                          eventId={event.id}
                          slug={event.slug}
                          status={event.status as EventStatusName}
                          title={event.title}
                        />
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
