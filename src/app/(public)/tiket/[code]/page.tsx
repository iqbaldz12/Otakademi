import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { Logo } from "@/components/site/Logo";
import { getRegistrationByCode } from "@/server/services/registration.service";
import { renderQrSvg, ticketPayload } from "@/server/services/ticket.service";
import {
  REGISTRATION_STATUS_META,
  PAYMENT_STATUS_META,
  EVENT_FORMAT_META,
  type RegistrationStatusName,
  type PaymentStatusName,
  type EventFormatName,
} from "@/lib/domain";
import {
  formatIDR,
  fmtDateLong,
  formatTimeRange,
  fmtDateTimeShort,
  buildIcsDataUrl,
  formatRelative,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Tiket Saya",
  // Ticket URLs contain a private code, so keep them out of search engines.
  robots: { index: false, follow: false },
};

/** Never cache: payment and check-in status must always be current. */
export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const reg = await getRegistrationByCode(code.toUpperCase());

  if (!reg) notFound();

  const { event, participant, payment, ticket } = reg;
  const statusMeta = REGISTRATION_STATUS_META[reg.status as RegistrationStatusName];
  const format = EVENT_FORMAT_META[event.format as EventFormatName];

  const isConfirmed = reg.status === "CONFIRMED" || reg.status === "ATTENDED";
  const awaitingPayment = reg.status === "WAITING_PAYMENT";
  const isWaitlist = reg.status === "WAITLIST";

  // Only render a QR once the ticket is actually valid for entry.
  const qrSvg = ticket && isConfirmed ? await renderQrSvg(ticketPayload(ticket.token)) : null;

  const location =
    event.format === "ONLINE"
      ? (event.venue ?? "Online")
      : (event.venue ?? "Akan diinformasikan");

  const icsUrl = buildIcsDataUrl({
    title: event.title,
    description: `Kode pendaftaran: ${reg.code}`,
    location,
    start: event.startAt,
    end: event.endAt,
    uid: reg.id,
  });

  return (
    <section className="section bg-surface">
      <div className="container-page max-w-3xl">
        {/* ---------- Status banner ---------- */}
        <div
          className={`anim-pop mb-6 flex items-start gap-3.5 rounded-[--radius-card] border p-5 ${
            isConfirmed
              ? "border-emerald-200 bg-emerald-50"
              : awaitingPayment
                ? "border-gold-200 bg-gold-50"
                : isWaitlist
                  ? "border-navy-200 bg-navy-50"
                  : "border-coral-200 bg-coral-50"
          }`}
        >
          <Icon
            name={
              (isConfirmed
                ? "check-circle"
                : awaitingPayment
                  ? "wallet"
                  : isWaitlist
                    ? "clock"
                    : "alert") as IconName
            }
            size={26}
            className={
              isConfirmed
                ? "text-emerald-600"
                : awaitingPayment
                  ? "text-gold-700"
                  : isWaitlist
                    ? "text-navy-600"
                    : "text-coral-600"
            }
          />
          <div className="flex-1">
            <h1 className="text-h3">
              {isConfirmed
                ? "Pendaftaran Terkonfirmasi"
                : awaitingPayment
                  ? "Menunggu Pembayaran"
                  : isWaitlist
                    ? "Kamu Masuk Daftar Tunggu"
                    : "Status Pendaftaran"}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-navy-600">
              {isConfirmed
                ? "Simpan halaman ini. Tunjukkan QR di bawah saat check-in."
                : awaitingPayment
                  ? "Kursimu ditahan sampai batas waktu pembayaran. Selesaikan pembayaran untuk menerbitkan tiket."
                  : isWaitlist
                    ? "Kami akan menghubungimu lewat email atau WhatsApp begitu ada kursi yang terbuka."
                    : `Status saat ini: ${statusMeta.label}.`}
            </p>
          </div>
        </div>

        {/* ---------- Ticket card ---------- */}
        <div className="card overflow-hidden">
          <div
            className="h-2 w-full"
            style={{ backgroundColor: event.bannerColor }}
            aria-hidden="true"
          />

          <div className="flex items-center justify-between gap-4 border-b border-dashed border-navy-200 p-5 sm:p-6">
            <Logo height={30} href={null} />
            <Badge tone={statusMeta.tone} dot>
              {statusMeta.label}
            </Badge>
          </div>

          <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1fr_auto]">
            {/* Details */}
            <div>
              <h2 className="text-h3">{event.title}</h2>

              {/* One wrapper div per term/description pair keeps the list valid. */}
              <dl className="mt-4 space-y-2.5 text-sm">
                {(
                  [
                    { icon: "calendar", label: "Tanggal", value: fmtDateLong(event.startAt) },
                    {
                      icon: "clock",
                      label: "Waktu",
                      value: formatTimeRange(event.startAt, event.endAt),
                    },
                    { icon: "pin", label: format.label, value: location },
                  ] as Array<{ icon: IconName; label: string; value: string }>
                ).map((row) => (
                  <div key={row.label} className="flex items-start gap-2.5">
                    <dt className="flex w-24 shrink-0 items-center gap-1.5 pt-px text-[0.7rem] font-bold uppercase text-navy-400">
                      <Icon name={row.icon} size={14} />
                      {row.label}
                    </dt>
                    <dd className="font-semibold text-navy-800">{row.value}</dd>
                  </div>
                ))}
                <div className="flex items-start gap-2.5">
                  <dt className="flex w-24 shrink-0 items-center gap-1.5 pt-px text-[0.7rem] font-bold uppercase text-navy-400">
                    <Icon name="users" size={14} />
                    Peserta
                  </dt>
                  <dd className="font-semibold text-navy-800">
                    {participant.name}
                    <span className="block text-xs font-normal text-navy-400">
                      {participant.email}
                    </span>
                  </dd>
                </div>
              </dl>

              {/* Registration code */}
              <div className="mt-5 rounded-xl border border-navy-100 bg-surface p-4">
                <span className="block text-[0.7rem] font-extrabold uppercase tracking-wide text-navy-400">
                  Kode Pendaftaran
                </span>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <code className="text-xl font-extrabold tracking-wide text-navy-900">
                    {reg.code}
                  </code>
                  <CopyButton value={reg.code} label="Salin kode" className="no-print" />
                </div>
              </div>
            </div>

            {/* QR */}
            <div className="flex flex-col items-center justify-start md:w-44">
              {qrSvg ? (
                <>
                  <div
                    className="w-40 rounded-xl border border-navy-100 bg-white p-3"
                    // Server-generated SVG from our own token, not user input.
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                  <p className="mt-2 text-center text-[0.7rem] font-semibold text-navy-400">
                    Tunjukkan saat check-in
                  </p>
                </>
              ) : (
                <div className="flex w-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 bg-surface p-5 text-center">
                  <Icon name="qr" size={30} className="text-navy-200" />
                  <p className="text-[0.7rem] font-semibold text-navy-400">
                    {awaitingPayment
                      ? "QR terbit setelah pembayaran dikonfirmasi"
                      : isWaitlist
                        ? "QR terbit kalau kursi tersedia"
                        : "QR belum tersedia"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Check-in stamp */}
          {ticket?.checkInAt && (
            <div className="flex items-center gap-2 border-t border-navy-100 bg-emerald-50 px-5 py-3.5 text-sm font-bold text-emerald-800 sm:px-6">
              <Icon name="check-circle" size={17} />
              Sudah check-in pada {fmtDateTimeShort(ticket.checkInAt)}
            </div>
          )}
        </div>

        {/* ---------- Payment panel ---------- */}
        {payment && payment.status !== "PAID" && (
          <div className="card mt-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-h3">Pembayaran</h2>
              <Badge tone={PAYMENT_STATUS_META[payment.status as PaymentStatusName].tone}>
                {PAYMENT_STATUS_META[payment.status as PaymentStatusName].label}
              </Badge>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-500">Nominal</dt>
                <dd className="text-lg font-extrabold text-coral-600 tnum">
                  {formatIDR(payment.amount)}
                </dd>
              </div>
              {payment.expiresAt && payment.status === "PENDING" && (
                <div className="flex justify-between">
                  <dt className="text-navy-500">Batas waktu</dt>
                  <dd className="font-semibold text-navy-800">
                    {fmtDateTimeShort(payment.expiresAt)}{" "}
                    <span className="text-xs font-normal text-navy-400">
                      ({formatRelative(payment.expiresAt)})
                    </span>
                  </dd>
                </div>
              )}
            </dl>

            {payment.status === "PENDING" && (
              <div className="mt-5 rounded-xl border border-gold-200 bg-gold-50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-navy-900">
                  <Icon name="info" size={16} className="text-gold-700" />
                  Cara Pembayaran
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">
                  Transfer sejumlah{" "}
                  <strong className="tnum">{formatIDR(payment.amount)}</strong> ke rekening
                  di bawah, lalu kirim bukti transfer ke WhatsApp kami dengan
                  menyertakan kode <strong>{reg.code}</strong>.
                </p>

                <div className="mt-3 rounded-lg bg-white p-3.5 text-sm">
                  <p className="font-extrabold text-navy-900">BCA 1234567890</p>
                  <p className="text-navy-500">a.n. Otakademi Indonesia</p>
                </div>

                <a
                  href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                    `Halo Otakademi, saya sudah transfer untuk pendaftaran ${reg.code} (${event.title}).`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-md mt-4 w-full"
                >
                  <Icon name="whatsapp" size={17} />
                  Kirim Bukti Transfer
                </a>

                <p className="mt-3 text-xs text-navy-400">
                  Verifikasi manual dilakukan tim kami pada jam kerja. Payment gateway
                  otomatis menyusul.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------- Actions ---------- */}
        <div className="no-print mt-6 flex flex-wrap gap-2.5">
          <a href={icsUrl} download={`${event.slug}.ics`} className="btn btn-outline btn-md">
            <Icon name="calendar" size={16} />
            Tambah ke Kalender
          </a>
          <Link href={`/event/${event.slug}`} className="btn btn-outline btn-md">
            <Icon name="eye" size={16} />
            Detail Event
          </Link>
          <Link href="/event" className="btn btn-ghost btn-md">
            Cari Kelas Lain
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-navy-400">
          Simpan link halaman ini untuk mengakses tiketmu kapan saja.
        </p>
      </div>
    </section>
  );
}
