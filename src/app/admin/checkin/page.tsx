import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { CheckInPanel } from "@/components/admin/CheckInPanel";
import { ActionButton } from "@/components/admin/ActionButton";
import { FilterSelect } from "@/components/admin/FilterSelect";
import { undoCheckInAction } from "@/server/actions/ops.actions";
import { listCheckInRoster } from "@/server/services/ticket.service";
import { db } from "@/server/db";
import { fmtTime, fmtDateShort } from "@/lib/format";

export const metadata: Metadata = { title: "Check-in" };
export const dynamic = "force-dynamic";

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId } = await searchParams;

  // Default to the event happening soonest, which is almost always the one
  // being run right now.
  const events = await db.event.findMany({
    where: { status: { in: ["PUBLISHED", "SOLD_OUT", "CLOSED", "COMPLETED"] } },
    select: { id: true, title: true, startAt: true },
    orderBy: { startAt: "desc" },
    take: 30,
  });

  const activeEventId = eventId ?? events[0]?.id;
  const activeEvent = events.find((e) => e.id === activeEventId);

  const roster = activeEventId ? await listCheckInRoster(activeEventId) : [];
  const checkedIn = roster.filter((r) => r.ticket?.checkInAt).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h2">Check-in</h1>
        <p className="mt-1 text-sm text-navy-500">
          Scan QR atau cari peserta secara manual saat acara berlangsung.
        </p>
      </div>

      <CheckInPanel />

      {/* ---------- Roster ---------- */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 p-5">
          <div>
            <h2 className="text-h3">Daftar Peserta</h2>
            {activeEvent && (
              <p className="mt-0.5 text-sm text-navy-500">
                {activeEvent.title} &middot; {fmtDateShort(activeEvent.startAt)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-navy-700 tnum">
              {checkedIn}/{roster.length} hadir
            </span>

            <FilterSelect
              name="eventId"
              basePath="/admin/checkin"
              label="Pilih event untuk check-in"
              value={activeEventId ?? ""}
              options={events.map((e) => ({ value: e.id, label: e.title }))}
              className="max-w-xs"
            />
          </div>
        </div>

        {/* Attendance progress */}
        {roster.length > 0 && (
          <div className="border-b border-navy-100 px-5 py-3">
            <div
              className="h-2 overflow-hidden rounded-full bg-navy-100"
              role="progressbar"
              aria-valuenow={Math.round((checkedIn / roster.length) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progres kehadiran"
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                style={{
                  width: `${Math.max(2, Math.round((checkedIn / roster.length) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {roster.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Icon name="users" size={30} className="text-navy-200" />
            <p className="text-sm text-navy-500">
              Belum ada peserta terkonfirmasi untuk event ini.
            </p>
          </div>
        ) : (
          <div className="scroll-slim max-h-[32rem] overflow-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only-x">Daftar hadir peserta</caption>
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-navy-100 text-left">
                  <th scope="col" className="px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Peserta
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Kode
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Kehadiran
                  </th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {roster.map((r) => (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      r.ticket?.checkInAt ? "bg-emerald-50/50" : "hover:bg-surface"
                    }`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-bold text-navy-900">{r.participant.name}</p>
                      <p className="text-xs text-navy-400">{r.participant.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/tiket/${r.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-bold text-navy-600 underline decoration-navy-200"
                      >
                        {r.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {r.ticket?.checkInAt ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <Icon name="check-circle" size={15} />
                          {fmtTime(r.ticket.checkInAt)}
                        </span>
                      ) : r.payment?.status === "PENDING" ? (
                        <Badge tone="gold">Belum bayar</Badge>
                      ) : (
                        <span className="text-xs text-navy-300">Belum hadir</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.ticket?.checkInAt && (
                        <ActionButton
                          action={undoCheckInAction.bind(null, r.id)}
                          variant="ghost"
                          icon="x"
                          pendingText="Membatalkan..."
                        >
                          Undo
                        </ActionButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
