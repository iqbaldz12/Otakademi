import { db } from "@/server/db";
import { sendMail } from "@/server/services/mailer.service";
import {
  generateCertificatePdf,
  type CertLayout,
} from "@/server/services/certificate.service";
import { fmtDateLong } from "@/lib/format";

/**
 * Certificate generation + delivery.
 *
 * Business rules:
 *  - Only an *attended* participant (has an Attendance row / status ATTENDED)
 *    can get a certificate.
 *  - The event must have a template uploaded.
 *  - Idempotent send: `certificateSentAt` guards against double delivery and
 *    doubles as the history flag.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type CertResult =
  | { ok: true; already: boolean; name: string; number: string }
  | { ok: false; reason: string };

/** Pulls the overlay layout off the event row into a plain object. */
function layoutFromEvent(e: {
  certNameX: number;
  certNameY: number;
  certNameSize: number;
  certNameColor: string;
  certDateShow: boolean;
  certDateX: number;
  certDateY: number;
  certDateSize: number;
  certNumberShow: boolean;
  certNumberX: number;
  certNumberY: number;
  certNumberSize: number;
  certQrShow: boolean;
  certQrX: number;
  certQrY: number;
  certQrSize: number;
}): CertLayout {
  return {
    nameX: e.certNameX,
    nameY: e.certNameY,
    nameSize: e.certNameSize,
    nameColor: e.certNameColor,
    dateShow: e.certDateShow,
    dateX: e.certDateX,
    dateY: e.certDateY,
    dateSize: e.certDateSize,
    numberShow: e.certNumberShow,
    numberX: e.certNumberX,
    numberY: e.certNumberY,
    numberSize: e.certNumberSize,
    qrShow: e.certQrShow,
    qrX: e.certQrX,
    qrY: e.certQrY,
    qrSize: e.certQrSize,
  };
}

/**
 * Stable per-registration certificate number.
 *
 * Format: OTK/<registration-tail>/CERTF/<year>, e.g. OTK/PNC4-K6C2/CERTF/2026.
 * The tail is the registration code without its leading "OTK-" prefix (dashes
 * inside the tail are kept), giving a tidy, traceable number.
 */
function makeCertNumber(code: string, year: number): string {
  const tail = code.toUpperCase().replace(/^OTK-/, "");
  return `OTK/${tail}/CERTF/${year}`;
}

/**
 * Builds the certificate PDF for a registration (does NOT send). Assigns a
 * certificate number if one doesn't exist yet. Returns the PDF buffer + meta.
 */
export async function buildCertificate(
  registrationId: string,
): Promise<
  | { ok: true; pdf: Buffer; name: string; number: string; email: string; eventTitle: string }
  | { ok: false; reason: string }
> {
  const reg = await db.registration.findUnique({
    where: { id: registrationId },
    include: {
      participant: { select: { name: true, email: true } },
      event: true,
      attendance: { select: { id: true } },
    },
  });

  if (!reg) return { ok: false, reason: "Pendaftaran tidak ditemukan." };

  // Rule: must be attended.
  const attended = reg.status === "ATTENDED" || Boolean(reg.attendance);
  if (!attended) {
    return { ok: false, reason: "Peserta belum melakukan absensi." };
  }

  if (!reg.event.certificateTemplate) {
    return { ok: false, reason: "Template sertifikat belum di-upload untuk event ini." };
  }

  // Assign/normalise the certificate number. Regenerate it when missing or when
  // it doesn't match the current format (e.g. older "OTK/CERT/..." numbers), so
  // changing the format applies to everyone.
  const expected = makeCertNumber(reg.code, reg.event.startAt.getFullYear());
  const number = reg.certificateNumber === expected ? reg.certificateNumber : expected;
  if (reg.certificateNumber !== number) {
    await db.registration.update({
      where: { id: reg.id },
      data: { certificateNumber: number },
    });
  }

  const pdf = await generateCertificatePdf(
    reg.event.certificateTemplate,
    layoutFromEvent(reg.event),
    {
      name: reg.participant.name,
      dateText: fmtDateLong(reg.event.startAt),
      certificateNumber: number,
      verifyUrl: `${SITE_URL}/verifikasi/${reg.code}`,
    },
  );

  if (!pdf) {
    return { ok: false, reason: "Gagal membuat PDF (template tidak terbaca)." };
  }

  return {
    ok: true,
    pdf,
    name: reg.participant.name,
    number,
    email: reg.participant.email,
    eventTitle: reg.event.title,
  };
}

/**
 * Generates and emails the certificate for one registration.
 *
 * `force = false` (default) skips a registration that already has
 * `certificateSentAt`, so bulk runs never double-send. Never throws.
 */
export async function sendCertificate(
  registrationId: string,
  options: { force?: boolean } = {},
): Promise<CertResult> {
  try {
    const existing = await db.registration.findUnique({
      where: { id: registrationId },
      select: { certificateSentAt: true, certificateNumber: true, participant: { select: { name: true } } },
    });
    if (!existing) return { ok: false, reason: "Pendaftaran tidak ditemukan." };

    if (existing.certificateSentAt && !options.force) {
      return {
        ok: true,
        already: true,
        name: existing.participant.name,
        number: existing.certificateNumber ?? "",
      };
    }

    const built = await buildCertificate(registrationId);
    if (!built.ok) return built;

    const ticketOrSite = `${SITE_URL}`;
    const result = await sendMail({
      to: built.email,
      subject: `Sertifikat kamu: ${built.eventTitle}`,
      text: [
        `Halo ${built.name},`,
        ``,
        `Terima kasih sudah hadir di "${built.eventTitle}".`,
        `Sertifikat kamu terlampir sebagai PDF (No. ${built.number}).`,
        ``,
        `Salam,`,
        `Tim Otakademi`,
        ticketOrSite,
      ].join("\n"),
      html: `
        <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;color:#1a2c4e">
          <h2 style="margin:0 0 6px">Sertifikat kamu sudah terbit 🎓</h2>
          <p style="color:#4e6b93">Halo <b>${escapeHtml(built.name)}</b>, terima kasih sudah hadir di <b>${escapeHtml(built.eventTitle)}</b>. Sertifikatmu terlampir sebagai PDF.</p>
          <p style="font-size:13px;color:#8fa3c2">Nomor sertifikat: ${escapeHtml(built.number)}</p>
          <p style="font-size:12px;color:#8fa3c2;border-top:1px solid #eef2f8;padding-top:12px">Salam, Tim Otakademi</p>
        </div>`,
      attachments: [
        {
          filename: `Sertifikat-${built.number.replace(/[^\w-]/g, "_")}.pdf`,
          content: built.pdf,
          contentType: "application/pdf",
        },
      ],
    });

    await db.notification.create({
      data: {
        template: "certificate_delivered",
        recipient: built.email,
        channel: "EMAIL",
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
      },
    });

    if (!result.ok) {
      return { ok: false, reason: `Gagal mengirim email: ${result.error ?? "unknown"}` };
    }

    await db.registration.update({
      where: { id: registrationId },
      data: { certificateSentAt: new Date() },
    });

    return { ok: true, already: false, name: built.name, number: built.number };
  } catch (err) {
    console.error("[sendCertificate] error:", err);
    return { ok: false, reason: "Terjadi kesalahan saat memproses sertifikat." };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type CertRosterRow = {
  registrationId: string;
  code: string;
  name: string;
  email: string;
  attended: boolean;
  certificateNumber: string | null;
  sentAt: Date | null;
};

/**
 * Roster for the certificate page: confirmed/attended registrations with their
 * attendance + certificate status. Non-attended rows are shown but their
 * actions are disabled in the UI.
 */
export async function listCertificateRoster(
  eventId: string,
): Promise<CertRosterRow[]> {
  const regs = await db.registration.findMany({
    where: { eventId, status: { in: ["CONFIRMED", "ATTENDED"] } },
    include: {
      participant: { select: { name: true, email: true } },
      attendance: { select: { id: true } },
    },
    orderBy: { participant: { name: "asc" } },
  });

  return regs.map((r) => ({
    registrationId: r.id,
    code: r.code,
    name: r.participant.name,
    email: r.participant.email,
    attended: r.status === "ATTENDED" || Boolean(r.attendance),
    certificateNumber: r.certificateNumber,
    sentAt: r.certificateSentAt,
  }));
}

export type CertVerification =
  | {
      valid: true;
      name: string;
      eventTitle: string;
      eventDate: Date;
      number: string;
      issuedAt: Date | null;
    }
  | { valid: false };

/**
 * Public certificate verification by registration code.
 *
 * A certificate is considered authentic when the participant attended and a
 * certificate number has been assigned (i.e. it was generated/issued). Does not
 * expose any sensitive data beyond name + event + number.
 */
export async function verifyCertificate(code: string): Promise<CertVerification> {
  const reg = await db.registration.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: {
      participant: { select: { name: true } },
      event: { select: { title: true, startAt: true } },
      attendance: { select: { id: true } },
    },
  });

  if (!reg) return { valid: false };

  const attended = reg.status === "ATTENDED" || Boolean(reg.attendance);
  if (!attended || !reg.certificateNumber) return { valid: false };

  return {
    valid: true,
    name: reg.participant.name,
    eventTitle: reg.event.title,
    eventDate: reg.event.startAt,
    number: reg.certificateNumber,
    issuedAt: reg.certificateSentAt,
  };
}

export type CertSummary = { attended: number; sent: number };

export async function certificateSummary(eventId: string): Promise<CertSummary> {
  const [attended, sent] = await Promise.all([
    db.registration.count({ where: { eventId, status: "ATTENDED" } }),
    db.registration.count({
      where: { eventId, certificateSentAt: { not: null } },
    }),
  ]);
  return { attended, sent };
}
