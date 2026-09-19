import { db } from "@/server/db";
import type { AttendanceMethod } from "@prisma/client";

/**
 * Attendance service.
 *
 * Attendance is a separate concern from the on-site QR check-in (`Ticket`):
 * it supports participants marking their own presence for online classes, plus
 * an admin roster/report per event. One `Attendance` row per registration
 * (enforced by the unique constraint), so marking twice is idempotent.
 *
 * Only a confirmed registration can be marked present. WAITING_PAYMENT,
 * WAITLIST, PENDING, and CANCELLED registrations are not attendees.
 */

const PRESENT_ELIGIBLE = ["CONFIRMED", "ATTENDED"] as const;

export type MarkAttendanceResult =
  | {
      ok: true;
      already: boolean;
      name: string;
      eventTitle: string;
      code: string;
      at: Date;
    }
  | { ok: false; reason: string };

/**
 * Records attendance for a registration.
 *
 * Idempotent: if a row already exists it is returned unchanged (with
 * `already: true`) rather than duplicated or overwritten, so a participant
 * refreshing or an admin double-clicking never causes a problem.
 */
export async function markAttendance(params: {
  registrationId: string;
  method: AttendanceMethod;
  markedBy?: string;
  note?: string;
}): Promise<MarkAttendanceResult> {
  const reg = await db.registration.findUnique({
    where: { id: params.registrationId },
    include: {
      participant: { select: { name: true } },
      event: { select: { title: true } },
      attendance: true,
    },
  });

  if (!reg) return { ok: false, reason: "Pendaftaran tidak ditemukan." };
  if (reg.status === "CANCELLED") {
    return { ok: false, reason: "Pendaftaran ini sudah dibatalkan." };
  }
  if (!PRESENT_ELIGIBLE.includes(reg.status as (typeof PRESENT_ELIGIBLE)[number])) {
    return {
      ok: false,
      reason:
        "Kehadiran hanya bisa dicatat untuk peserta yang sudah terkonfirmasi.",
    };
  }

  // Already recorded: return it as-is.
  if (reg.attendance) {
    return {
      ok: true,
      already: true,
      name: reg.participant.name,
      eventTitle: reg.event.title,
      code: reg.code,
      at: reg.attendance.checkedInAt,
    };
  }

  const at = new Date();
  // Create the attendance row and flip the registration to ATTENDED in one
  // transaction so the two never drift apart.
  await db.$transaction([
    db.attendance.create({
      data: {
        eventId: reg.eventId,
        registrationId: reg.id,
        method: params.method,
        markedBy: params.markedBy,
        note: params.note,
        checkedInAt: at,
      },
    }),
    db.registration.update({
      where: { id: reg.id },
      data: { status: "ATTENDED" },
    }),
  ]);

  return {
    ok: true,
    already: false,
    name: reg.participant.name,
    eventTitle: reg.event.title,
    code: reg.code,
    at,
  };
}

/** Participant self check-in by their registration code (from the ticket page). */
export async function markAttendanceByCode(
  code: string,
  markedBy?: string,
): Promise<MarkAttendanceResult> {
  const reg = await db.registration.findUnique({
    where: { code: code.trim().toUpperCase() },
    select: {
      id: true,
      attendance: { select: { id: true } },
      event: { select: { attendanceOpen: true } },
    },
  });
  if (!reg) return { ok: false, reason: "Kode pendaftaran tidak ditemukan." };

  // Only allow self check-in while the admin has opened attendance. An existing
  // record still returns fine (idempotent) even after it's closed again.
  if (!reg.event.attendanceOpen && !reg.attendance) {
    return {
      ok: false,
      reason: "Absensi belum dibuka oleh panitia. Coba lagi saat kelas dimulai.",
    };
  }

  return markAttendance({ registrationId: reg.id, method: "SELF", markedBy });
}

/** Removes an attendance record and reverts the registration to CONFIRMED. */
export async function unmarkAttendance(registrationId: string): Promise<void> {
  await db.$transaction([
    db.attendance.deleteMany({ where: { registrationId } }),
    db.registration.update({
      where: { id: registrationId },
      data: { status: "CONFIRMED" },
    }),
  ]);
}

export type AttendanceRosterRow = {
  registrationId: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  present: boolean;
  method: AttendanceMethod | null;
  checkedInAt: Date | null;
  note: string | null;
};

/**
 * Full attendance roster for an event: every confirmed/attended registration,
 * flagged with whether they've been marked present. Drives the admin "Lihat
 * Absen" page.
 */
export async function listAttendanceRoster(
  eventId: string,
): Promise<AttendanceRosterRow[]> {
  const regs = await db.registration.findMany({
    where: {
      eventId,
      status: { in: ["CONFIRMED", "ATTENDED"] },
    },
    include: {
      participant: { select: { name: true, email: true, phone: true } },
      attendance: true,
    },
    orderBy: { participant: { name: "asc" } },
  });

  return regs.map((r) => ({
    registrationId: r.id,
    code: r.code,
    name: r.participant.name,
    email: r.participant.email,
    phone: r.participant.phone,
    present: Boolean(r.attendance),
    method: r.attendance?.method ?? null,
    checkedInAt: r.attendance?.checkedInAt ?? null,
    note: r.attendance?.note ?? null,
  }));
}

/**
 * Opens or closes self check-in for an event.
 *
 * This is the manual "webinar room" switch: participants can only mark their
 * own attendance while it's open. Returns the event slug so the caller can
 * revalidate the right pages.
 */
export async function setAttendanceOpen(
  eventId: string,
  open: boolean,
): Promise<{ ok: true; slug: string } | { ok: false; reason: string }> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, slug: true, status: true },
  });
  if (!event) return { ok: false, reason: "Event tidak ditemukan." };
  if (event.status === "CANCELLED") {
    return { ok: false, reason: "Event dibatalkan, absensi tidak bisa dibuka." };
  }

  await db.event.update({ where: { id: eventId }, data: { attendanceOpen: open } });
  return { ok: true, slug: event.slug };
}

/** Quick present/total counts for an event, for badges and summaries. */
export async function attendanceSummary(
  eventId: string,
): Promise<{ present: number; total: number }> {
  const [present, total] = await Promise.all([
    db.attendance.count({ where: { eventId } }),
    db.registration.count({
      where: { eventId, status: { in: ["CONFIRMED", "ATTENDED"] } },
    }),
  ]);
  return { present, total };
}
