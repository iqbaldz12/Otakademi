"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, audit } from "@/server/auth";
import { validateEvent, type FieldErrors } from "@/lib/validate";
import {
  setEventActive,
  deleteEvent,
  cancelEvent,
  createEvent,
  updateEvent,
} from "@/server/services/event.service";
import { queueEventReminders } from "@/server/services/notification.service";

export type ActionResult = { ok: boolean; reason?: string };

/**
 * Revalidates every surface an event change can affect.
 *
 * The event's own detail page matters most: it is statically generated, so
 * without an explicit revalidation a deactivated event would keep serving its
 * cached HTML (and stay reachable) until the ISR window expired. The sitemap is
 * cached too, so it gets refreshed rather than advertising a hidden event.
 */
function revalidateEventSurfaces(slug?: string) {
  revalidatePath("/");
  revalidatePath("/event");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  revalidatePath("/admin/event");
  if (slug) {
    revalidatePath(`/event/${slug}`);
    revalidatePath(`/event/${slug}/daftar`);
  }
}

/**
 * Backs the active/non-active Switch in the admin event table.
 *
 * Returns a plain result object rather than throwing so the Switch can roll its
 * optimistic state back and show the reason.
 */
export async function toggleEventActive(
  eventId: string,
  active: boolean,
): Promise<ActionResult> {
  const session = await requireAdmin();

  const result = await setEventActive(eventId, active);
  if (!result.ok) return { ok: false, reason: result.reason };

  await audit(
    session.email,
    active ? "event.activate" : "event.deactivate",
    eventId,
    `status -> ${result.status}`,
  );

  // Pass the slug so the event's own cached detail page is dropped too.
  revalidateEventSurfaces(result.slug);
  return { ok: true };
}

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const result = await deleteEvent(eventId);
  if (!result.ok) return { ok: false, reason: result.reason };

  await audit(session.email, "event.delete", eventId);
  revalidateEventSurfaces(result.slug);
  return { ok: true };
}

export async function cancelEventAction(eventId: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const result = await cancelEvent(eventId);
  if (!result) return { ok: false, reason: "Event tidak ditemukan." };

  await audit(session.email, "event.cancel", eventId);
  revalidateEventSurfaces(result.slug);
  return { ok: true, reason: "Event dibatalkan dan pendaftar aktif ikut dibatalkan." };
}

export async function sendRemindersAction(
  eventId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const count = await queueEventReminders(eventId);
  await audit(session.email, "event.remind", eventId, `${count} penerima`);
  revalidatePath("/admin");

  if (count === 0) {
    return { ok: false, reason: "Belum ada peserta yang bisa dikirimi pengingat." };
  }
  return { ok: true, reason: `Pengingat untuk ${count} peserta masuk antrean.` };
}

export type EventFormState = {
  ok: boolean;
  errors?: FieldErrors;
  message?: string;
};

/**
 * Create/update from the admin event form.
 *
 * Uses the `useActionState` shape so validation errors render next to their
 * fields and the form keeps working without JavaScript.
 */
export async function saveEventAction(
  eventId: string | null,
  _prev: EventFormState,
  form: FormData,
): Promise<EventFormState> {
  const session = await requireAdmin();

  const parsed = validateEvent(form);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, message: "Periksa kembali isian yang ditandai." };
  }

  let slug: string;
  if (eventId) {
    const updated = await updateEvent(eventId, parsed.data);
    slug = updated.slug;
    await audit(session.email, "event.update", eventId, parsed.data.title);
  } else {
    const created = await createEvent(parsed.data);
    slug = created.slug;
    await audit(session.email, "event.create", created.id, parsed.data.title);
  }

  revalidateEventSurfaces(slug);
  redirect("/admin/event?saved=1");
}
