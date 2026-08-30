import { db } from "@/server/db";
import { ticketToken } from "@/lib/ids";
import { queueNotification } from "@/server/services/notification.service";
import { promoteFromWaitlist } from "@/server/services/registration.service";
import type { PaymentStatus } from "@prisma/client";

/**
 * Marks a payment as settled.
 *
 * Idempotent on purpose: payment gateways retry webhooks, and a duplicate
 * delivery must not issue a second ticket or double-count revenue. If the
 * payment is already PAID we return early.
 */
export async function markPaid(input: {
  registrationCode?: string;
  paymentId?: string;
  method?: string;
  providerRef?: string;
}): Promise<{ ok: true; alreadyPaid: boolean } | { ok: false; reason: string }> {
  return db.$transaction(async (tx) => {
    const payment = input.paymentId
      ? await tx.payment.findUnique({
          where: { id: input.paymentId },
          include: { registration: { include: { ticket: true } } },
        })
      : input.registrationCode
        ? await tx.payment.findFirst({
            where: { registration: { code: input.registrationCode } },
            include: { registration: { include: { ticket: true } } },
          })
        : null;

    if (!payment) return { ok: false as const, reason: "Pembayaran tidak ditemukan." };

    if (payment.status === "PAID") {
      return { ok: true as const, alreadyPaid: true };
    }

    if (payment.status === "REFUNDED") {
      return { ok: false as const, reason: "Pembayaran ini sudah direfund." };
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        method: input.method ?? payment.method ?? "manual",
        providerRef: input.providerRef ?? payment.providerRef,
      },
    });

    await tx.registration.update({
      where: { id: payment.registrationId },
      data: { status: "CONFIRMED" },
    });

    // Issue the ticket only if one wasn't already created.
    if (!payment.registration.ticket) {
      await tx.ticket.create({
        data: { registrationId: payment.registrationId, token: ticketToken() },
      });
    }

    const participant = await tx.participant.findFirst({
      where: { registrations: { some: { id: payment.registrationId } } },
      select: { email: true },
    });

    if (participant) {
      await queueNotification(
        { template: "payment_success", recipient: participant.email },
        tx,
      );
    }

    return { ok: true as const, alreadyPaid: false };
  });
}

export async function setPaymentStatus(
  paymentId: string,
  status: PaymentStatus,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : null,
      },
      select: { registrationId: true },
    });

    // Keep the registration in step with the money.
    if (status === "PAID") {
      await tx.registration.update({
        where: { id: payment.registrationId },
        data: { status: "CONFIRMED" },
      });
      await tx.ticket.upsert({
        where: { registrationId: payment.registrationId },
        create: { registrationId: payment.registrationId, token: ticketToken() },
        update: {},
      });
    }

    if (status === "EXPIRED" || status === "FAILED" || status === "REFUNDED") {
      await tx.registration.update({
        where: { id: payment.registrationId },
        data: { status: "CANCELLED" },
      });
    }
  });
}

/**
 * Releases seats held by payments that ran past their window.
 *
 * Designed to be called from a scheduled job (spec section 14: "Queue/scheduled
 * job untuk reminder dan payment reconciliation").
 */
export async function expireStalePayments(): Promise<{
  expired: number;
  promoted: number;
}> {
  const stale = await db.payment.findMany({
    where: {
      status: { in: ["PENDING", "UNPAID"] },
      expiresAt: { lt: new Date() },
    },
    select: { id: true, registration: { select: { id: true, eventId: true } } },
  });

  if (stale.length === 0) return { expired: 0, promoted: 0 };

  await db.$transaction([
    db.payment.updateMany({
      where: { id: { in: stale.map((p) => p.id) } },
      data: { status: "EXPIRED" },
    }),
    db.registration.updateMany({
      where: { id: { in: stale.map((p) => p.registration.id) } },
      data: { status: "CANCELLED" },
    }),
  ]);

  // Freed seats should go to whoever is waiting.
  const eventIds = [...new Set(stale.map((p) => p.registration.eventId))];
  let promoted = 0;
  for (const eventId of eventIds) {
    promoted += await promoteFromWaitlist(eventId);
  }

  return { expired: stale.length, promoted };
}

export async function listPayments(filter: { status?: string } = {}) {
  return db.payment.findMany({
    where: filter.status ? { status: filter.status as PaymentStatus } : {},
    include: {
      registration: {
        include: {
          participant: { select: { name: true, email: true } },
          event: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
}
