import { db } from "@/server/db";
import { sendMail } from "@/server/services/mailer.service";
import {
  generateCertificatePdf,
  type CertLayout,
} from "@/server/services/certificate.service";
import { fmtDateLong } from "@/lib/format";
import { eventCode as genEventCode } from "@/lib/ids";
import type { Event, EventStaff, EventStaffRole } from "@prisma/client";

/**
 * Moderator / speaker (pemateri) certificates.
 *
 * Unlike participants, staff don't register, so:
 *  - names are typed by the admin (EventStaff rows),
 *  - the certificate number is derived from the EVENT code (slug) + role +
 *    order, e.g. OTK/EVT-7QF2/NRS-01/2026,
 *  - each role has its own template + name/QR layout on the Event,
 *  - the QR verifies via /verifikasi/staff/<id>.
 *
 * Output is a PDF the admin can download; if the staff has an email, it can also
 * be sent. `certificateSentAt` guards against double emailing.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const ROLE_TAG: Record<EventStaffRole, string> = {
  MODERATOR: "MOD",
  SPEAKER: "NRS", // narasumber
};

const ROLE_LABEL: Record<EventStaffRole, string> = {
  MODERATOR: "Moderator",
  SPEAKER: "Narasumber",
};

/**
 * Returns the event's short unique code, generating + persisting one on first
 * use. Retries on the rare uniqueness collision.
 */
async function ensureEventCode(eventId: string, existing: string | null): Promise<string> {
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genEventCode();
    try {
      await db.event.update({ where: { id: eventId }, data: { eventCode: code } });
      return code;
    } catch {
      // Unique collision — try another code.
    }
  }
  // Fallback: derive from id (still unique) if random somehow kept colliding.
  const fallback = `EVT-${eventId.slice(-4).toUpperCase()}`;
  await db.event.update({ where: { id: eventId }, data: { eventCode: fallback } });
  return fallback;
}

/** Builds a staff certificate number, e.g. OTK/EVT-7QF2/NRS-01/2026. */
function makeStaffNumber(
  code: string,
  role: EventStaffRole,
  order: number,
  year: number,
): string {
  const seq = String(order + 1).padStart(2, "0");
  return `OTK/${code}/${ROLE_TAG[role]}-${seq}/${year}`;
}

/** Picks the right template + name/QR layout for a role off the event. */
function roleTemplate(
  event: Event,
  role: EventStaffRole,
): { template: string | null; layout: CertLayout } {
  const isMod = role === "MODERATOR";
  const template = isMod ? event.modTemplate : event.spkTemplate;
  const layout: CertLayout = {
    nameX: isMod ? event.modNameX : event.spkNameX,
    nameY: isMod ? event.modNameY : event.spkNameY,
    nameSize: isMod ? event.modNameSize : event.spkNameSize,
    nameColor: isMod ? event.modNameColor : event.spkNameColor,
    // Staff templates don't print an event-date line.
    dateShow: false,
    dateX: 0.5,
    dateY: 0.6,
    dateSize: 0.03,
    // Certificate number is admin-toggled per role.
    numberShow: isMod ? event.modNumberShow : event.spkNumberShow,
    numberX: isMod ? event.modNumberX : event.spkNumberX,
    numberY: isMod ? event.modNumberY : event.spkNumberY,
    numberSize: isMod ? event.modNumberSize : event.spkNumberSize,
    qrShow: isMod ? event.modQrShow : event.spkQrShow,
    qrX: isMod ? event.modQrX : event.spkQrX,
    qrY: isMod ? event.modQrY : event.spkQrY,
    qrSize: isMod ? event.modQrSize : event.spkQrSize,
  };
  return { template, layout };
}

export type StaffCertResult =
  | { ok: true; pdf: Buffer; name: string; number: string; filename: string }
  | { ok: false; reason: string };

/**
 * Builds (and number-stamps) a staff member's certificate PDF. Assigns the
 * number on first build. Does not send.
 */
export async function buildStaffCertificate(
  staffId: string,
): Promise<StaffCertResult> {
  const staff = await db.eventStaff.findUnique({
    where: { id: staffId },
    include: { event: true },
  });
  if (!staff) return { ok: false, reason: "Data tidak ditemukan." };

  const { event } = staff;
  const { template, layout } = roleTemplate(event, staff.role);

  if (!template) {
    return {
      ok: false,
      reason: `Template sertifikat ${ROLE_LABEL[staff.role]} belum di-upload.`,
    };
  }

  // Order within the role determines the sequence number.
  const peers = await db.eventStaff.findMany({
    where: { eventId: event.id, role: staff.role },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const order = Math.max(0, peers.findIndex((p) => p.id === staff.id));

  const code = await ensureEventCode(event.id, event.eventCode);
  const number =
    staff.certificateNumber ??
    makeStaffNumber(code, staff.role, order, event.startAt.getFullYear());
  if (!staff.certificateNumber) {
    await db.eventStaff.update({
      where: { id: staff.id },
      data: { certificateNumber: number },
    });
  }

  const pdf = await generateCertificatePdf(template, layout, {
    name: staff.name,
    dateText: fmtDateLong(event.startAt),
    certificateNumber: number,
    verifyUrl: `${SITE_URL}/verifikasi/staff/${staff.id}`,
  });
  if (!pdf) return { ok: false, reason: "Gagal membuat PDF (template tidak terbaca)." };

  return {
    ok: true,
    pdf,
    name: staff.name,
    number,
    filename: `Sertifikat-${ROLE_LABEL[staff.role]}-${number.replace(/[^\w-]/g, "_")}.pdf`,
  };
}

/** Emails a staff certificate (requires an email on the record). */
export async function sendStaffCertificate(
  staffId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const staff = await db.eventStaff.findUnique({
    where: { id: staffId },
    include: { event: { select: { title: true } } },
  });
  if (!staff) return { ok: false, reason: "Data tidak ditemukan." };
  if (!staff.email) {
    return { ok: false, reason: "Email belum diisi untuk orang ini." };
  }

  const built = await buildStaffCertificate(staffId);
  if (!built.ok) return built;

  const result = await sendMail({
    to: staff.email,
    subject: `Sertifikat ${ROLE_LABEL[staff.role]}: ${staff.event.title}`,
    text: [
      `Halo ${staff.name},`,
      ``,
      `Terima kasih atas peran sebagai ${ROLE_LABEL[staff.role]} di "${staff.event.title}".`,
      `Sertifikat terlampir sebagai PDF (No. ${built.number}).`,
      ``,
      `Salam, Tim Otakademi`,
    ].join("\n"),
    html: `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;color:#1a2c4e">
      <h2 style="margin:0 0 6px">Sertifikat kamu sudah terbit</h2>
      <p style="color:#4e6b93">Halo <b>${escapeHtml(staff.name)}</b>, terima kasih atas peran sebagai <b>${ROLE_LABEL[staff.role]}</b> di <b>${escapeHtml(staff.event.title)}</b>. Sertifikat terlampir.</p>
      <p style="font-size:13px;color:#8fa3c2">Nomor: ${escapeHtml(built.number)}</p>
    </div>`,
    attachments: [
      { filename: built.filename, content: built.pdf, contentType: "application/pdf" },
    ],
  });

  await db.notification.create({
    data: {
      template: "staff_certificate_delivered",
      recipient: staff.email,
      channel: "EMAIL",
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : null,
    },
  });

  if (!result.ok) return { ok: false, reason: `Gagal kirim email: ${result.error ?? "unknown"}` };

  await db.eventStaff.update({
    where: { id: staffId },
    data: { certificateSentAt: new Date() },
  });
  return { ok: true };
}

export type StaffRow = {
  id: string;
  role: EventStaffRole;
  roleLabel: string;
  name: string;
  email: string | null;
  certificateNumber: string | null;
  sentAt: Date | null;
};

/** Lists an event's staff (moderators + speakers), ordered. */
export async function listEventStaff(eventId: string): Promise<StaffRow[]> {
  const rows = await db.eventStaff.findMany({
    where: { eventId },
    orderBy: [{ role: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((s: EventStaff) => ({
    id: s.id,
    role: s.role,
    roleLabel: ROLE_LABEL[s.role],
    name: s.name,
    email: s.email,
    certificateNumber: s.certificateNumber,
    sentAt: s.certificateSentAt,
  }));
}

export type StaffVerification =
  | { valid: true; name: string; roleLabel: string; eventTitle: string; eventDate: Date; number: string; issuedAt: Date | null }
  | { valid: false };

/** Public verification for a staff certificate by staff id. */
export async function verifyStaffCertificate(
  staffId: string,
): Promise<StaffVerification> {
  const staff = await db.eventStaff.findUnique({
    where: { id: staffId },
    include: { event: { select: { title: true, startAt: true } } },
  });
  if (!staff || !staff.certificateNumber) return { valid: false };

  return {
    valid: true,
    name: staff.name,
    roleLabel: ROLE_LABEL[staff.role],
    eventTitle: staff.event.title,
    eventDate: staff.event.startAt,
    number: staff.certificateNumber,
    issuedAt: staff.certificateSentAt,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
