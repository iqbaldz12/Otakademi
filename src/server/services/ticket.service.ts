import QRCode from "qrcode";
import { db } from "@/server/db";

/**
 * Renders the ticket QR as an inline SVG string.
 *
 * Runs on the server only, so the `qrcode` package never reaches the browser
 * bundle. Inlining the SVG also means the ticket needs zero extra network
 * requests and stays crisp at any size (and prints cleanly).
 */
export async function renderQrSvg(payload: string): Promise<string> {
  const svg = await QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    // Colours drawn from the brand navy for a non-generic ticket.
    color: { dark: "#1A2C4E", light: "#00000000" },
  });

  // Make it responsive and accessible: drop the fixed size, add a11y attrs.
  return svg
    .replace(/<svg([^>]*)>/, (_m, attrs: string) => {
      const cleaned = attrs
        .replace(/\swidth="[^"]*"/, "")
        .replace(/\sheight="[^"]*"/, "");
      return `<svg${cleaned} width="100%" height="100%" role="img" aria-label="Kode QR tiket" shape-rendering="crispEdges">`;
    });
}

/** Check-in payload. Kept short so the QR stays low-density and scans fast. */
export function ticketPayload(token: string): string {
  return `OTK:${token}`;
}

export function parseTicketPayload(scanned: string): string | null {
  const trimmed = scanned.trim();
  if (trimmed.startsWith("OTK:")) return trimmed.slice(4);
  // Tolerate a bare token: staff may type it in from the printed ticket.
  if (/^[0-9a-f]{32}$/i.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

export type CheckInResult =
  | {
      ok: true;
      alreadyCheckedIn: boolean;
      name: string;
      eventTitle: string;
      code: string;
      at: Date;
    }
  | { ok: false; reason: string };

/**
 * Checks a participant in by ticket token.
 *
 * Re-scanning an already checked-in ticket is reported rather than treated as an
 * error, and the original timestamp is preserved: door staff scan twice all the
 * time and shouldn't see a scary failure.
 */
export async function checkInByToken(rawToken: string): Promise<CheckInResult> {
  const token = parseTicketPayload(rawToken);
  if (!token) return { ok: false, reason: "Kode QR tidak dikenali." };

  const ticket = await db.ticket.findUnique({
    where: { token },
    include: {
      registration: {
        include: {
          participant: { select: { name: true } },
          event: { select: { title: true } },
        },
      },
    },
  });

  if (!ticket) return { ok: false, reason: "Tiket tidak ditemukan." };

  const reg = ticket.registration;

  if (reg.status === "CANCELLED") {
    return { ok: false, reason: "Pendaftaran ini sudah dibatalkan." };
  }

  if (ticket.checkInAt) {
    return {
      ok: true,
      alreadyCheckedIn: true,
      name: reg.participant.name,
      eventTitle: reg.event.title,
      code: reg.code,
      at: ticket.checkInAt,
    };
  }

  const at = new Date();
  await db.$transaction([
    db.ticket.update({ where: { id: ticket.id }, data: { checkInAt: at } }),
    db.registration.update({
      where: { id: reg.id },
      data: { status: "ATTENDED" },
    }),
  ]);

  return {
    ok: true,
    alreadyCheckedIn: false,
    name: reg.participant.name,
    eventTitle: reg.event.title,
    code: reg.code,
    at,
  };
}

/** Manual check-in from the admin list, by registration code. */
export async function checkInByCode(code: string): Promise<CheckInResult> {
  const reg = await db.registration.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { ticket: true },
  });

  if (!reg) return { ok: false, reason: "Kode pendaftaran tidak ditemukan." };
  if (!reg.ticket) {
    return { ok: false, reason: "Peserta ini belum punya tiket (belum terkonfirmasi)." };
  }

  return checkInByToken(reg.ticket.token);
}

/** Undo, for the inevitable mis-scan. */
export async function undoCheckIn(registrationId: string): Promise<void> {
  await db.$transaction([
    db.ticket.updateMany({
      where: { registrationId },
      data: { checkInAt: null },
    }),
    db.registration.update({
      where: { id: registrationId },
      data: { status: "CONFIRMED" },
    }),
  ]);
}

/** Roster for the on-site check-in screen. */
export async function listCheckInRoster(eventId: string) {
  return db.registration.findMany({
    where: {
      eventId,
      status: { in: ["CONFIRMED", "ATTENDED", "WAITING_PAYMENT"] },
    },
    include: {
      participant: { select: { name: true, email: true, phone: true } },
      ticket: true,
      payment: { select: { status: true } },
    },
    orderBy: { participant: { name: "asc" } },
  });
}
