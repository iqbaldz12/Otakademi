import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/admin/ActionButton";
import {
  markAttendanceAction,
  unmarkAttendanceAction,
  toggleAttendanceOpenAction,
} from "@/server/actions/attendance.actions";
import { CopyButton } from "@/components/ui/CopyButton";
import { getEventById } from "@/server/services/event.service";
import {
  listAttendanceRoster,
  attendanceSummary,
} from "@/server/services/attendance.service";
import { renderQrSvg } from "@/server/services/ticket.service";
import { fmtDateLong, fmtTime } from "@/lib/format";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = { title: "Absensi Event" };
export const dynamic = "force-dynamic";

export default async function EventAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await getEventById(id);
  if (!event) notFound();

  const [roster, summary] = await Promise.all([
    listAttendanceRoster(id),
    attendanceSummary(id),
  ]);

  // Link peserta untuk cek tiket & absen. Ditampilkan/di-scan admin saat event.
  const checkInUrl = `${SITE_URL}/cek-tiket`;
  const checkInQr = await renderQrSvg(checkInUrl);

  const percent =
    summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/event" className="btn btn-ghost btn-sm -ml-3 mb-3">
          <Icon name="arrow-left" size={16} />
          Kembali ke daftar event
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-h2">Absensi</h1>
            <p className="mt-1 text-sm text-navy-500">
              {event.title} &middot; {fmtDateLong(event.startAt)}
            </p>
          </div>
          <Link href={`/admin/event/${event.id}`} className="btn btn-outline btn-sm">
            <Icon name="edit" size={15} />
            Edit Event
          </Link>
        </div>
      </div>

      {/* Kontrol buka/tutup absensi (seperti membuka ruang webinar) */}
      <div
        className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${
          event.attendanceOpen
            ? "border-emerald-200 bg-emerald-50"
            : "border-navy-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <Icon
            name={event.attendanceOpen ? "check-circle" : "clock"}
            size={22}
            className={`mt-0.5 shrink-0 ${
              event.attendanceOpen ? "text-emerald-600" : "text-navy-400"
            }`}
          />
          <div>
            <h2 className="text-h3">
              {event.attendanceOpen ? "Absensi Terbuka" : "Absensi Tertutup"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-navy-600">
              {event.attendanceOpen
                ? "Peserta terkonfirmasi bisa absen mandiri dari halaman tiketnya sekarang. Tutup lagi setelah kelas selesai."
                : "Buka absensi menjelang kelas dimulai supaya peserta bisa absen mandiri. Sebelum dibuka, tombol absen di sisi peserta tidak aktif."}
            </p>
          </div>
        </div>
        <ActionButton
          action={toggleAttendanceOpenAction.bind(
            null,
            event.id,
            !event.attendanceOpen,
          )}
          variant={event.attendanceOpen ? "coral" : "primary"}
          size="md"
          icon={event.attendanceOpen ? "x-circle" : "check-circle"}
          pendingText="Memproses..."
          className="shrink-0"
        >
          {event.attendanceOpen ? "Tutup Absensi" : "Buka Absensi"}
        </ActionButton>
      </div>

      {/* Link + QR yang dibagikan/ditampilkan ke peserta saat event */}
      <div className="card p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="text-h3">Link Absensi Peserta</h2>
            <p className="mt-1 text-sm leading-relaxed text-navy-600">
              Tampilkan atau bagikan link/QR ini saat event. Peserta scan atau buka
              link, masukkan kode pendaftaran, lalu tekan <strong>Absen Sekarang</strong>.
            </p>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-navy-200 bg-surface p-2 pl-3.5">
              <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-navy-800">
                {checkInUrl}
              </span>
              <CopyButton value={checkInUrl} label="Salin link" iconOnly />
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/cek-tiket"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                <Icon name="external" size={15} />
                Buka Halaman Absen
              </Link>
            </div>
          </div>

          {/* QR menuju halaman cek-tiket */}
          <div className="flex shrink-0 flex-col items-center">
            <div className="w-36 rounded-xl border border-navy-100 bg-white p-3">
              <div
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: checkInQr }}
              />
            </div>
            <p className="mt-2 text-center text-[0.7rem] font-semibold text-navy-400">
              Scan untuk absen
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-navy-400">Kehadiran</p>
            <p className="mt-0.5 text-2xl font-extrabold text-navy-900 tnum">
              {summary.present}
              <span className="text-base font-bold text-navy-400">
                {" "}
                / {summary.total} peserta
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-emerald-600 tnum">{percent}%</p>
            <p className="text-xs text-navy-400">hadir</p>
          </div>
        </div>
        {summary.total > 0 && (
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-navy-100"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progres kehadiran"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${Math.max(2, percent)}%` }}
            />
          </div>
        )}
      </div>

      {/* Roster */}
      {roster.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <Icon name="users" size={32} className="text-navy-200" />
          <h2 className="text-h3">Belum ada peserta terkonfirmasi</h2>
          <p className="max-w-sm text-sm text-navy-500">
            Absensi hanya menampilkan peserta yang sudah terkonfirmasi. Peserta yang
            belum bayar belum masuk daftar ini.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <caption className="sr-only-x">Daftar absensi peserta</caption>
              <thead>
                <tr className="border-b border-navy-100 bg-surface text-left">
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
                    key={r.registrationId}
                    className={`transition-colors ${
                      r.present ? "bg-emerald-50/50" : "hover:bg-surface"
                    }`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-bold text-navy-900">{r.name}</p>
                      <p className="text-xs text-navy-400">{r.email}</p>
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
                      {r.present ? (
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                            <Icon name="check-circle" size={15} />
                            {r.checkedInAt ? fmtTime(r.checkedInAt) : "Hadir"}
                          </span>
                          <Badge tone={r.method === "SELF" ? "green" : "navy"}>
                            {r.method === "SELF" ? "Absen mandiri" : "Oleh admin"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-navy-300">Belum hadir</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.present ? (
                        <ActionButton
                          action={unmarkAttendanceAction.bind(
                            null,
                            event.id,
                            r.registrationId,
                          )}
                          variant="ghost"
                          icon="x"
                          pendingText="Membatalkan..."
                        >
                          Batalkan
                        </ActionButton>
                      ) : (
                        <ActionButton
                          action={markAttendanceAction.bind(
                            null,
                            event.id,
                            r.registrationId,
                          )}
                          variant="outline"
                          icon="check"
                          pendingText="Mencatat..."
                        >
                          Tandai Hadir
                        </ActionButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
