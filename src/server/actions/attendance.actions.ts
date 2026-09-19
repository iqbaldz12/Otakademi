"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit } from "@/server/auth";
import {
  markAttendance,
  markAttendanceByCode,
  unmarkAttendance,
  setAttendanceOpen,
} from "@/server/services/attendance.service";

export type AttendanceResult = { ok: boolean; reason?: string };

/**
 * Admin marks a participant present from the "Lihat Absen" roster.
 */
export async function markAttendanceAction(
  eventId: string,
  registrationId: string,
): Promise<AttendanceResult> {
  const session = await requireAdmin();

  const result = await markAttendance({
    registrationId,
    method: "ADMIN",
    markedBy: session.email,
  });
  if (!result.ok) return { ok: false, reason: result.reason };

  await audit(session.email, "attendance.mark", registrationId, result.code);
  revalidatePath(`/admin/event/${eventId}/absen`);
  revalidatePath("/admin/checkin");

  return {
    ok: true,
    reason: result.already ? "Peserta sudah tercatat hadir." : "Kehadiran dicatat.",
  };
}

/** Admin removes an attendance mark (mis-click / correction). */
export async function unmarkAttendanceAction(
  eventId: string,
  registrationId: string,
): Promise<AttendanceResult> {
  const session = await requireAdmin();

  await unmarkAttendance(registrationId);
  await audit(session.email, "attendance.unmark", registrationId);
  revalidatePath(`/admin/event/${eventId}/absen`);
  revalidatePath("/admin/checkin");

  return { ok: true, reason: "Kehadiran dibatalkan." };
}

/**
 * Admin opens/closes self check-in for an event (the manual "webinar room"
 * switch). While open, confirmed participants can absen from their ticket.
 */
export async function toggleAttendanceOpenAction(
  eventId: string,
  open: boolean,
): Promise<AttendanceResult> {
  const session = await requireAdmin();

  const result = await setAttendanceOpen(eventId, open);
  if (!result.ok) return { ok: false, reason: result.reason };

  await audit(
    session.email,
    open ? "attendance.open" : "attendance.close",
    eventId,
  );
  revalidatePath(`/admin/event/${eventId}/absen`);
  revalidatePath(`/tiket`);

  return {
    ok: true,
    reason: open
      ? "Absensi dibuka. Peserta sekarang bisa absen mandiri."
      : "Absensi ditutup.",
  };
}

/**
 * Participant self check-in from their own ticket page.
 *
 * No admin session: the registration code is the credential. The service only
 * allows confirmed registrations, and the mark is idempotent.
 */
export async function selfCheckInAction(
  code: string,
): Promise<AttendanceResult> {
  const result = await markAttendanceByCode(code, "self");
  if (!result.ok) return { ok: false, reason: result.reason };

  // Refresh the participant's ticket page so the state flips immediately.
  revalidatePath(`/tiket/${code.trim().toUpperCase()}`);

  return {
    ok: true,
    reason: result.already
      ? "Kamu sudah tercatat hadir sebelumnya."
      : "Kehadiran kamu tercatat. Sampai jumpa di kelas!",
  };
}
