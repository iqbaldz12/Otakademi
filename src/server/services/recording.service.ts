import { db } from "@/server/db";

/**
 * Paid video-archive access.
 *
 * A participant unlocks the recorded session with their registration code, but
 * only if they actually paid. This keeps the archive gated without a login:
 * the code proves which registration, and the payment status proves the right
 * to watch.
 */

export type ArchiveAccess =
  | {
      state: "ok";
      eventTitle: string;
      recordingUrl: string;
      participantName: string;
      code: string;
    }
  // Registration/event found, but the person hasn't paid yet.
  | { state: "unpaid"; eventTitle: string; amount: number; code: string }
  // The archive isn't published for this event (no link or admin switched off).
  | { state: "not_published"; eventTitle: string }
  | { state: "not_found" };

/** Is this event's paid archive considered "free" (price 0 -> no paywall)? */
function isFreeEvent(price: number): boolean {
  return price <= 0;
}

/**
 * Resolves whether a registration code may watch the event recording.
 *
 * Rules:
 *  - Unknown code -> not_found.
 *  - Archive not open, or no link -> not_published.
 *  - Free event -> any confirmed registration can watch.
 *  - Paid event -> only when the payment is PAID.
 */
export async function getArchiveAccess(code: string): Promise<ArchiveAccess> {
  const reg = await db.registration.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: {
      participant: { select: { name: true } },
      payment: { select: { status: true, amount: true } },
      event: {
        select: {
          title: true,
          price: true,
          recordingUrl: true,
          recordingOpen: true,
        },
      },
    },
  });

  if (!reg) return { state: "not_found" };

  const { event } = reg;

  if (!event.recordingOpen || !event.recordingUrl) {
    return { state: "not_published", eventTitle: event.title };
  }

  const paid = reg.payment?.status === "PAID";
  const free = isFreeEvent(event.price);

  // Paid event and not settled yet -> show the paywall state.
  if (!free && !paid) {
    return {
      state: "unpaid",
      eventTitle: event.title,
      amount: reg.payment?.amount ?? event.price,
      code: reg.code,
    };
  }

  return {
    state: "ok",
    eventTitle: event.title,
    recordingUrl: event.recordingUrl,
    participantName: reg.participant.name,
    code: reg.code,
  };
}
