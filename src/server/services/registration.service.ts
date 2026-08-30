import { db } from "@/server/db";
import { registrationCode, ticketToken } from "@/lib/ids";
import { applyPromo } from "@/lib/domain";
import { SEAT_HOLDING_STATUS } from "@/server/services/event.service";
import { findUsablePromo } from "@/server/services/promo.service";
import { queueNotification } from "@/server/services/notification.service";
import type { RegistrationInput } from "@/lib/validate";
import type { Prisma, RegistrationStatus } from "@prisma/client";

export type RegisterOutcome =
  | {
      ok: true;
      code: string;
      status: RegistrationStatus;
      amountDue: number;
      discount: number;
    }
  | { ok: false; reason: string; field?: string };

/** How long a pending payment holds its seat before it can be expired. */
const PAYMENT_WINDOW_HOURS = 24;

/**
 * Creates a registration.
 *
 * Concurrency: the whole decision runs inside one transaction that begins by
 * locking the Event row (`FOR UPDATE`). Two people clicking "Daftar" on the last
 * seat at the same moment are therefore serialized -- the second one is placed
 * on the waitlist instead of overselling. Without that lock, both could read
 * "1 seat left" and both get confirmed.
 */
export async function registerForEvent(
  eventId: string,
  input: RegistrationInput,
): Promise<RegisterOutcome> {
  try {
    return await db.$transaction(async (tx) => {
      // 1. Lock the event row for the duration of this transaction.
      const locked = await tx.$queryRaw<
        Array<{
          id: string;
          capacity: number;
          price: number;
          status: string;
          title: string;
        }>
      >`SELECT id, capacity, price, status, title FROM "Event" WHERE id = ${eventId} FOR UPDATE`;

      const event = locked[0];
      if (!event) return { ok: false as const, reason: "Event tidak ditemukan." };

      if (event.status === "DRAFT" || event.status === "CANCELLED") {
        return { ok: false as const, reason: "Event ini belum atau tidak lagi tersedia." };
      }
      if (event.status === "CLOSED") {
        return { ok: false as const, reason: "Pendaftaran untuk event ini sudah ditutup." };
      }
      if (event.status === "COMPLETED") {
        return { ok: false as const, reason: "Event ini sudah selesai." };
      }

      // 2. Reject duplicates: same email, same event, still active.
      const duplicate = await tx.registration.findFirst({
        where: {
          eventId,
          participant: { email: input.email },
          status: { notIn: ["CANCELLED"] },
        },
        select: { code: true },
      });

      if (duplicate) {
        return {
          ok: false as const,
          field: "email",
          reason: `Email ini sudah terdaftar di event ini (kode ${duplicate.code}).`,
        };
      }

      // 3. Seat maths under the lock.
      const taken = await tx.registration.count({
        where: { eventId, status: { in: [...SEAT_HOLDING_STATUS] } },
      });

      const unlimited = event.capacity <= 0;
      const full = !unlimited && taken >= event.capacity;
      const isPaid = event.price > 0;

      // 4. Promo, only meaningful for paid events.
      let discount = 0;
      let appliedPromoCode: string | null = null;

      if (isPaid && input.promoCode) {
        const promo = await findUsablePromo(input.promoCode, tx);
        if (promo) {
          const result = applyPromo(event.price, {
            type: promo.type,
            value: promo.value,
          });
          discount = result.discount;
          appliedPromoCode = promo.code;
          await tx.promo.update({
            where: { id: promo.id },
            data: { usage: { increment: 1 } },
          });
        }
      }

      const amountDue = Math.max(0, event.price - discount);

      // 5. Decide the status.
      //    Full            -> WAITLIST (no seat consumed)
      //    Paid & has cost -> WAITING_PAYMENT (seat held for the payment window)
      //    Free or free-by-promo -> CONFIRMED immediately
      let status: RegistrationStatus;
      if (full) status = "WAITLIST";
      else if (amountDue > 0) status = "WAITING_PAYMENT";
      else status = "CONFIRMED";

      // 6. Reuse the participant record for repeat attendees.
      const existing = await tx.participant.findFirst({
        where: { email: input.email },
        select: { id: true },
      });

      const participantData = {
        name: input.name,
        email: input.email,
        phone: input.phone,
        institution: input.institution ?? null,
        city: input.city ?? null,
        occupation: input.occupation ?? null,
        consent: input.consent,
      };

      const participant = existing
        ? await tx.participant.update({
            where: { id: existing.id },
            data: participantData,
          })
        : await tx.participant.create({ data: participantData });

      // 7. Create the registration.
      const answers: Prisma.InputJsonValue = {
        goal: input.goal ?? null,
        experience: input.experience ?? null,
      };

      const code = registrationCode();

      const registration = await tx.registration.create({
        data: {
          code,
          eventId,
          participantId: participant.id,
          status,
          source: input.source ?? null,
          referral: input.referral ?? null,
          promoCode: appliedPromoCode,
          answers,
        },
      });

      // 8. Payment row for anything with a balance.
      if (amountDue > 0) {
        await tx.payment.create({
          data: {
            registrationId: registration.id,
            amount: amountDue,
            status: "PENDING",
            expiresAt: new Date(
              Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000,
            ),
          },
        });
      }

      // 9. Ticket is issued as soon as attendance is certain.
      if (status === "CONFIRMED") {
        await tx.ticket.create({
          data: { registrationId: registration.id, token: ticketToken() },
        });
      }

      // 10. Flip the event to SOLD_OUT once the last seat goes.
      if (!unlimited && status !== "WAITLIST" && taken + 1 >= event.capacity) {
        await tx.event.update({
          where: { id: eventId },
          data: { status: "SOLD_OUT" },
        });
      }

      // 11. Queue the right outbound message.
      await queueNotification(
        {
          template:
            status === "WAITLIST"
              ? "registration_waitlist"
              : status === "WAITING_PAYMENT"
                ? "registration_awaiting_payment"
                : "registration_confirmed",
          recipient: input.email,
          channel: "EMAIL",
        },
        tx,
      );

      return { ok: true as const, code, status, amountDue, discount };
    });
  } catch (err) {
    // Unique-constraint collision on the registration code is the only
    // realistic race left; both are safe for the caller to retry.
    console.error("[registerForEvent]", err);
    return {
      ok: false as const,
      reason: "Pendaftaran gagal diproses. Coba lagi sebentar.",
    };
  }
}

/** Full registration record for the public ticket/status page. */
export async function getRegistrationByCode(code: string) {
  return db.registration.findUnique({
    where: { code },
    include: { event: true, participant: true, payment: true, ticket: true },
  });
}

export type AdminRegistrationFilter = {
  eventId?: string;
  status?: string;
  paymentStatus?: string;
  search?: string;
};

/** Participant CRM listing for the admin. */
export async function listRegistrations(filter: AdminRegistrationFilter = {}) {
  const where: Prisma.RegistrationWhereInput = {};

  if (filter.eventId) where.eventId = filter.eventId;
  if (filter.status) where.status = filter.status as RegistrationStatus;
  if (filter.paymentStatus) {
    where.payment = { status: filter.paymentStatus as never };
  }
  if (filter.search) {
    where.OR = [
      { code: { contains: filter.search, mode: "insensitive" } },
      { participant: { name: { contains: filter.search, mode: "insensitive" } } },
      { participant: { email: { contains: filter.search, mode: "insensitive" } } },
      { participant: { phone: { contains: filter.search } } },
    ];
  }

  return db.registration.findMany({
    where,
    include: {
      participant: true,
      event: { select: { id: true, title: true, startAt: true, price: true } },
      payment: true,
      ticket: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export type RegistrationRow = Awaited<ReturnType<typeof listRegistrations>>[number];

/**
 * Moves a registration to a new status.
 *
 * Promoting off the waitlist issues a ticket (free events) or opens a payment
 * window (paid events), so a waitlisted person converts cleanly.
 */
export async function updateRegistrationStatus(
  id: string,
  status: RegistrationStatus,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const reg = await tx.registration.findUnique({
      where: { id },
      include: { event: { select: { price: true } }, ticket: true, payment: true },
    });
    if (!reg) return;

    await tx.registration.update({ where: { id }, data: { status } });

    const needsTicket =
      (status === "CONFIRMED" || status === "ATTENDED") && !reg.ticket;

    if (needsTicket) {
      await tx.ticket.create({
        data: { registrationId: id, token: ticketToken() },
      });
    }

    if (status === "WAITING_PAYMENT" && !reg.payment && reg.event.price > 0) {
      await tx.payment.create({
        data: {
          registrationId: id,
          amount: reg.event.price,
          status: "PENDING",
          expiresAt: new Date(Date.now() + PAYMENT_WINDOW_HOURS * 3600 * 1000),
        },
      });
    }
  });
}

/** Bulk status change from the admin table. */
export async function bulkUpdateStatus(
  ids: string[],
  status: RegistrationStatus,
): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await db.registration.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });
  return result.count;
}

/**
 * Promotes the longest-waiting people off the waitlist into the seats that just
 * opened up. Called after cancellations or payment expiry.
 */
export async function promoteFromWaitlist(eventId: string): Promise<number> {
  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      Array<{ capacity: number; price: number }>
    >`SELECT capacity, price FROM "Event" WHERE id = ${eventId} FOR UPDATE`;

    const event = locked[0];
    if (!event || event.capacity <= 0) return 0;

    const taken = await tx.registration.count({
      where: { eventId, status: { in: [...SEAT_HOLDING_STATUS] } },
    });

    const free = event.capacity - taken;
    if (free <= 0) return 0;

    const waiting = await tx.registration.findMany({
      where: { eventId, status: "WAITLIST" },
      orderBy: { createdAt: "asc" },
      take: free,
      select: { id: true },
    });

    for (const reg of waiting) {
      if (event.price > 0) {
        await tx.registration.update({
          where: { id: reg.id },
          data: { status: "WAITING_PAYMENT" },
        });
        await tx.payment.upsert({
          where: { registrationId: reg.id },
          create: {
            registrationId: reg.id,
            amount: event.price,
            status: "PENDING",
            expiresAt: new Date(Date.now() + PAYMENT_WINDOW_HOURS * 3600 * 1000),
          },
          update: {
            status: "PENDING",
            expiresAt: new Date(Date.now() + PAYMENT_WINDOW_HOURS * 3600 * 1000),
          },
        });
      } else {
        await tx.registration.update({
          where: { id: reg.id },
          data: { status: "CONFIRMED" },
        });
        await tx.ticket.upsert({
          where: { registrationId: reg.id },
          create: { registrationId: reg.id, token: ticketToken() },
          update: {},
        });
      }
    }

    // Event may no longer be sold out.
    if (waiting.length < free) {
      await tx.event.updateMany({
        where: { id: eventId, status: "SOLD_OUT" },
        data: { status: "PUBLISHED" },
      });
    }

    return waiting.length;
  });
}

/** CSV export. Quotes every field so commas in names can't break columns. */
export function toCsv(rows: RegistrationRow[]): string {
  const header = [
    "Kode",
    "Nama",
    "Email",
    "WhatsApp",
    "Institusi",
    "Kota",
    "Event",
    "Tanggal Event",
    "Status",
    "Pembayaran",
    "Nominal",
    "Promo",
    "Sumber",
    "Check-in",
    "Terdaftar",
  ];

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '""';
    return `"${String(v).replace(/"/g, '""')}"`;
  };

  const lines = rows.map((r) =>
    [
      r.code,
      r.participant.name,
      r.participant.email,
      r.participant.phone,
      r.participant.institution ?? "",
      r.participant.city ?? "",
      r.event.title,
      r.event.startAt.toISOString(),
      r.status,
      r.payment?.status ?? "-",
      r.payment?.amount ?? 0,
      r.promoCode ?? "",
      r.source ?? "",
      r.ticket?.checkInAt ? r.ticket.checkInAt.toISOString() : "",
      r.createdAt.toISOString(),
    ]
      .map(escape)
      .join(","),
  );

  // BOM so Excel opens UTF-8 names correctly.
  return "\uFEFF" + [header.map(escape).join(","), ...lines].join("\r\n");
}
