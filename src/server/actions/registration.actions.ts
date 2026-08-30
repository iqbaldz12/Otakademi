"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, audit } from "@/server/auth";
import { validateRegistration, type FieldErrors } from "@/lib/validate";
import {
  registerForEvent,
  updateRegistrationStatus,
  bulkUpdateStatus,
  promoteFromWaitlist,
} from "@/server/services/registration.service";
import { checkPromo } from "@/server/services/promo.service";
import type { RegistrationStatus } from "@prisma/client";

export type RegisterState = {
  ok: boolean;
  errors?: FieldErrors;
  message?: string;
};

/**
 * Public registration submit.
 *
 * On success it redirects to the ticket page. `redirect()` throws internally, so
 * it must sit outside any try/catch.
 */
export async function submitRegistration(
  eventId: string,
  eventSlug: string,
  _prev: RegisterState,
  form: FormData,
): Promise<RegisterState> {
  const parsed = validateRegistration(form);
  if (!parsed.ok) {
    return {
      ok: false,
      errors: parsed.errors,
      message: "Ada isian yang perlu diperbaiki.",
    };
  }

  const outcome = await registerForEvent(eventId, parsed.data);

  if (!outcome.ok) {
    return {
      ok: false,
      errors: outcome.field ? { [outcome.field]: outcome.reason } : undefined,
      message: outcome.reason,
    };
  }

  revalidatePath(`/event/${eventSlug}`);
  revalidatePath("/event");
  revalidatePath("/admin");

  redirect(`/tiket/${outcome.code}`);
}

/** Promo check on the registration form, without leaving the page. */
export async function checkPromoAction(
  code: string,
  price: number,
): Promise<
  | { valid: true; discount: number; final: number; label: string; code: string }
  | { valid: false; reason: string }
> {
  return checkPromo(code, price);
}

export async function setRegistrationStatusAction(
  id: string,
  status: RegistrationStatus,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await requireAdmin();
  await updateRegistrationStatus(id, status);
  await audit(session.email, "registration.status", id, status);

  revalidatePath("/admin/pendaftar");
  revalidatePath("/admin");
  return { ok: true, reason: `Status diubah ke ${status}.` };
}

export async function bulkStatusAction(
  ids: string[],
  status: RegistrationStatus,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await requireAdmin();

  if (ids.length === 0) {
    return { ok: false, reason: "Pilih minimal satu peserta." };
  }

  const count = await bulkUpdateStatus(ids, status);
  await audit(session.email, "registration.bulk", undefined, `${count} -> ${status}`);

  revalidatePath("/admin/pendaftar");
  revalidatePath("/admin");
  return { ok: true, reason: `${count} peserta diperbarui.` };
}

export async function promoteWaitlistAction(
  eventId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await requireAdmin();
  const promoted = await promoteFromWaitlist(eventId);
  await audit(session.email, "registration.promote", eventId, `${promoted} naik`);

  revalidatePath("/admin/pendaftar");
  revalidatePath("/admin");

  return promoted > 0
    ? { ok: true, reason: `${promoted} peserta naik dari waitlist.` }
    : { ok: false, reason: "Tidak ada kursi kosong atau waitlist kosong." };
}
