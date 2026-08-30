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
