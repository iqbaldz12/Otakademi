import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

type Db = Pick<typeof db, "notification"> | Prisma.TransactionClient;

export type NotificationTemplate =
  | "registration_confirmed"
  | "registration_awaiting_payment"
  | "registration_waitlist"
  | "payment_success"
  | "payment_expired"
  | "event_reminder"
  | "event_cancelled";

/** Human-readable copy per template, used by the admin log view. */
export const TEMPLATE_LABEL: Record<NotificationTemplate, string> = {
  registration_confirmed: "Konfirmasi pendaftaran",
  registration_awaiting_payment: "Instruksi pembayaran",
  registration_waitlist: "Masuk waitlist",
  payment_success: "Pembayaran berhasil",
  payment_expired: "Pembayaran kedaluwarsa",
  event_reminder: "Pengingat event",
  event_cancelled: "Event dibatalkan",
};

/**
 * Records an outbound message.
 *
 * The MVP writes to an outbox table instead of calling an email provider: the
 * spec deliberately leaves the provider unchosen (section 13). A worker can
 * later drain QUEUED rows, so switching provider touches one file and no
 * business logic.
 */
export async function queueNotification(
  input: {
    template: NotificationTemplate;
    recipient: string;
    channel?: "EMAIL" | "WHATSAPP";
  },
  client: Db = db,
): Promise<void> {
  await client.notification.create({
    data: {
      template: input.template,
      recipient: input.recipient,
      channel: input.channel ?? "EMAIL",
      status: "QUEUED",
    },
  });
}

/** Queues reminders for everyone confirmed on an event. */
export async function queueEventReminders(eventId: string): Promise<number> {
  const recipients = await db.registration.findMany({
    where: { eventId, status: { in: ["CONFIRMED", "WAITING_PAYMENT"] } },
    select: { participant: { select: { email: true } } },
  });

  if (recipients.length === 0) return 0;

  await db.notification.createMany({
    data: recipients.map((r) => ({
      template: "event_reminder",
      recipient: r.participant.email,
      channel: "EMAIL" as const,
      status: "QUEUED" as const,
    })),
  });

  return recipients.length;
}

export async function listNotifications(limit = 100) {
  return db.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// Ticket email
// ---------------------------------------------------------------------------

import { sendMail } from "@/server/services/mailer.service";
import { fmtDateLong, formatTimeRange } from "@/lib/format";
import { EVENT_FORMAT_META, type EventFormatName } from "@/lib/domain";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "";

/**
 * Sends the ticket email for a confirmed registration.
 *
 * Idempotent: the ticket's `emailSentAt` is set on success and guards against a
 * second send. Never throws — a mail failure is logged and recorded, but must
 * not break registration/payment.
 */
export async function sendTicketEmail(registrationId: string): Promise<void> {
  try {
    const reg = await db.registration.findUnique({
      where: { id: registrationId },
      include: {
        participant: { select: { name: true, email: true } },
        event: true,
        ticket: true,
      },
    });

    if (!reg || !reg.ticket) return;
    if (reg.status !== "CONFIRMED" && reg.status !== "ATTENDED") return;
    if (reg.ticket.emailSentAt) return;

    const { event, participant } = reg;

    // Jangan kirim ke alamat akun pengirim sendiri (mis. kalau yang daftar
    // memakai email Otakademi). Percuma dan hanya memenuhi inbox/Sent admin.
    const senderEmail = process.env.SMTP_USER?.trim().toLowerCase();
    if (senderEmail && participant.email.trim().toLowerCase() === senderEmail) {
      // Tandai sudah "terkirim" supaya tidak dicoba berulang.
      await db.ticket.update({
        where: { id: reg.ticket.id },
        data: { emailSentAt: new Date() },
      });
      return;
    }
    const format = EVENT_FORMAT_META[event.format as EventFormatName];
    const isOnline = event.format === "ONLINE" || event.format === "HYBRID";
    const where =
      event.format === "ONLINE"
        ? `Online${event.venue ? ` - ${event.venue}` : ""}`
        : (event.venue ?? "Lokasi diinformasikan menyusul");
    const ticketUrl = `${SITE_URL}/tiket/${reg.code}`;
    const accent = event.bannerColor || "#132340";

    // ---- Plain-text version ----
    const textLines = [
      `Halo ${participant.name},`,
      ``,
      `Pendaftaran kamu untuk "${event.title}" sudah TERKONFIRMASI. Simpan tiket ini.`,
      ``,
      `Kode pendaftaran : ${reg.code}`,
      `Tanggal          : ${fmtDateLong(event.startAt)}`,
      `Waktu            : ${formatTimeRange(event.startAt, event.endAt)} WIB`,
      `${format.label}            : ${where}`,
      `Peserta          : ${participant.name} (${participant.email})`,
    ];
    if (isOnline && event.meetingLink)
      textLines.push(``, `Link kelas online: ${event.meetingLink}`);
    textLines.push(
      ``,
      `Buka tiket kamu kapan saja: ${ticketUrl}`,
      `Kalau link tiket hilang, buka ${SITE_URL}/cek-tiket lalu masukkan kodenya.`,
      ``,
      `Sampai jumpa di kelas!`,
      `Tim Otakademi`,
    );
    const text = textLines.join("\n");

    // ---- HTML version: mirrors the on-site ticket card ----
    const detailRow = (label: string, value: string) =>
      `<tr>
        <td style="padding:5px 14px 5px 0;color:#8fa3c2;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:5px 0;color:#1a2c4e;font-weight:600;font-size:14px">${value}</td>
      </tr>`;

    const meetingBlock =
      isOnline && event.meetingLink
        ? `<div style="margin-top:16px;border:1px solid #a7f3d0;background:#ecfdf5;border-radius:12px;padding:14px">
             <p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.5px;color:#047857;text-transform:uppercase">Link Kelas Online</p>
             <a href="${escapeHtml(event.meetingLink)}" style="color:#065f46;font-weight:700;font-size:14px;word-break:break-all">${escapeHtml(event.meetingLink)}</a>
           </div>`
        : "";

    const html = `
      <div style="background:#f4f7fb;padding:24px 12px">
        <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#1a2c4e">
          <div style="background:#ffffff;border:1px solid #e6edf7;border-radius:16px;overflow:hidden">
            <div style="background:${escapeHtml(accent)};height:6px"></div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px dashed #cbd9ec">
              <span style="font-weight:800;font-size:16px;color:#132340">Otak<span style="color:#fca90a">ademi</span></span>
              <span style="border:1px solid #a7f3d0;background:#ecfdf5;color:#047857;font-weight:700;font-size:12px;padding:4px 10px;border-radius:999px">● Terkonfirmasi</span>
            </div>

            <div style="padding:20px">
              <h2 style="margin:0 0 14px;font-size:20px;color:#132340">${escapeHtml(event.title)}</h2>

              <table style="border-collapse:collapse;width:100%">
                ${detailRow("Tanggal", escapeHtml(fmtDateLong(event.startAt)))}
                ${detailRow("Waktu", escapeHtml(formatTimeRange(event.startAt, event.endAt) + " WIB"))}
                ${detailRow(format.label, escapeHtml(where))}
                ${detailRow("Peserta", `${escapeHtml(participant.name)}<br><span style="font-weight:400;color:#8fa3c2;font-size:12px">${escapeHtml(participant.email)}</span>`)}
              </table>

              ${meetingBlock}

              <div style="margin-top:16px;border:1px solid #e6edf7;background:#f7f9fc;border-radius:12px;padding:14px">
                <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.5px;color:#8fa3c2;text-transform:uppercase">Kode Pendaftaran</p>
                <p style="margin:0;font-size:22px;font-weight:800;letter-spacing:2px;color:#132340">${escapeHtml(reg.code)}</p>
                <p style="margin:8px 0 0;font-size:12px;color:#4e6b93">Simpan kode ini. Kalau link tiket hilang, buka <a href="${SITE_URL}/cek-tiket" style="color:#24395c">/cek-tiket</a> dan masukkan kode ini.</p>
              </div>
            </div>
          </div>

          <p style="text-align:center;margin:18px 0 6px">
            <a href="${ticketUrl}" style="display:inline-block;background:#fca90a;color:#132340;font-weight:700;text-decoration:none;padding:11px 22px;border-radius:999px">Buka Halaman Tiket</a>
          </p>
          <p style="text-align:center;font-size:12px;color:#8fa3c2;margin:10px 0 0">Email ini dikirim karena kamu mendaftar di Otakademi. Sampai jumpa di kelas!</p>
        </div>
      </div>
    `;

    const result = await sendMail({
      to: participant.email,
      subject: `Tiket kamu: ${event.title} (${reg.code})`,
      text,
      html,
      replyTo: CONTACT_EMAIL || undefined,
    });

    await db.notification.create({
      data: {
        template: "ticket_delivered",
        recipient: participant.email,
        channel: "EMAIL",
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
      },
    });

    if (result.ok) {
      await db.ticket.update({
        where: { id: reg.ticket.id },
        data: { emailSentAt: new Date() },
      });
    } else {
      console.error(
        `[sendTicketEmail] gagal kirim tiket ${reg.code} ke ${participant.email}: ${result.error}`,
      );
    }
  } catch (err) {
    console.error("[sendTicketEmail] error:", err);
  }
}

/** Minimal HTML escaper for user-supplied values in the email body. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
