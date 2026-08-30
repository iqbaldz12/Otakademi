"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit, destroySession } from "@/server/auth";
import { redirect } from "next/navigation";
import { markPaid, setPaymentStatus, expireStalePayments } from "@/server/services/payment.service";
import { checkInByToken, checkInByCode, undoCheckIn } from "@/server/services/ticket.service";
import { setPromoActive, deletePromo, createPromo } from "@/server/services/promo.service";
import type { PaymentStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

/** Manual verification fallback required by the spec's acceptance criteria. */
export async function confirmPaymentAction(
  paymentId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await requireAdmin();

  const result = await markPaid({ paymentId, method: "manual_verification" });
  if (!result.ok) return { ok: false, reason: result.reason };

  await audit(session.email, "payment.confirm", paymentId);
  revalidatePath("/admin/pembayaran");
  revalidatePath("/admin");

  return {
    ok: true,
    reason: result.alreadyPaid
      ? "Pembayaran ini sudah lunas sebelumnya."
      : "Pembayaran dikonfirmasi, tiket diterbitkan.",
  };
}

export async function setPaymentStatusAction(
  paymentId: string,
  status: PaymentStatus,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await requireAdmin();
  await setPaymentStatus(paymentId, status);
  await audit(session.email, "payment.status", paymentId, status);

  revalidatePath("/admin/pembayaran");
  revalidatePath("/admin");
  return { ok: true, reason: `Status pembayaran: ${status}.` };
}

export async function expirePaymentsAction(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const session = await requireAdmin();
  const { expired, promoted } = await expireStalePayments();
  await audit(session.email, "payment.reconcile", undefined, `${expired} expired`);

  revalidatePath("/admin/pembayaran");
  revalidatePath("/admin");

  if (expired === 0) return { ok: true, reason: "Tidak ada pembayaran kedaluwarsa." };
  return {
    ok: true,
    reason: `${expired} pembayaran kedaluwarsa, ${promoted} peserta naik dari waitlist.`,
  };
}

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------

export type CheckInState = {
  status: "idle" | "ok" | "repeat" | "error";
  message?: string;
  name?: string;
  code?: string;
};

/** Handles both a scanned QR payload and a manually typed registration code. */
export async function checkInAction(
  _prev: CheckInState,
  form: FormData,
): Promise<CheckInState> {
  await requireAdmin();

  const value = String(form.get("value") ?? "").trim();
  if (!value) return { status: "error", message: "Masukkan kode atau scan QR." };

  // A QR payload starts with OTK: or is a 32-char hex token; anything else is
  // treated as a human-typed registration code.
  const looksLikeToken = value.startsWith("OTK:") || /^[0-9a-f]{32}$/i.test(value);

  const result = looksLikeToken
    ? await checkInByToken(value)
    : await checkInByCode(value);

  revalidatePath("/admin/checkin");
  revalidatePath("/admin");

  if (!result.ok) return { status: "error", message: result.reason };

  return {
    status: result.alreadyCheckedIn ? "repeat" : "ok",
    name: result.name,
    code: result.code,
    message: result.alreadyCheckedIn
      ? `Sudah check-in sebelumnya.`
      : `Check-in berhasil.`,
  };
}

export async function undoCheckInAction(
  registrationId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await requireAdmin();
  await undoCheckIn(registrationId);
  await audit(session.email, "checkin.undo", registrationId);

  revalidatePath("/admin/checkin");
  return { ok: true, reason: "Check-in dibatalkan." };
}

// ---------------------------------------------------------------------------
// Promos
// ---------------------------------------------------------------------------

export async function togglePromoAction(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; reason?: string }> {
  await requireAdmin();
  await setPromoActive(id, active);
  revalidatePath("/admin/promo");
  return { ok: true };
}

export async function deletePromoAction(
  id: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await requireAdmin();
  await deletePromo(id);
  await audit(session.email, "promo.delete", id);
  revalidatePath("/admin/promo");
  return { ok: true };
}

export async function createPromoAction(
  _prev: { ok: boolean; message?: string },
  form: FormData,
): Promise<{ ok: boolean; message?: string }> {
  const session = await requireAdmin();

  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const type = String(form.get("type") ?? "PERCENT") as "FIXED" | "PERCENT";
  const value = Number(form.get("value") ?? 0);
  const quota = Number(form.get("quota") ?? 0);

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    return { ok: false, message: "Kode 3-40 karakter, huruf/angka/-/_ saja." };
  }
  if (!Number.isInteger(value) || value <= 0) {
    return { ok: false, message: "Nilai promo harus lebih dari 0." };
  }
  if (type === "PERCENT" && value > 100) {
    return { ok: false, message: "Diskon persen maksimal 100." };
  }

  try {
    await createPromo({ code, type, value, quota });
  } catch {
    return { ok: false, message: "Kode promo itu sudah dipakai." };
  }

  await audit(session.email, "promo.create", code);
  revalidatePath("/admin/promo");
  return { ok: true, message: `Promo ${code} dibuat.` };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
