import { db } from "@/server/db";
import { SEAT_HOLDING_STATUS } from "@/server/services/event.service";

export type DashboardSummary = {
  activeEvents: number;
  totalRegistrants: number;
  paidCount: number;
  revenue: number;
  attendedCount: number;
  attendanceRate: number;
  todayRegistrations: number;
  todayPaid: number;
  awaitingPayment: number;
  waitlistCount: number;
};

/**
 * Dashboard headline numbers.
 *
 * Every figure comes from an aggregate query rather than loading rows into
 * memory, and they all run concurrently so the dashboard is one round trip of
 * latency rather than ten.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    activeEvents,
    totalRegistrants,
    paidAgg,
    attendedCount,
    confirmedish,
    todayRegistrations,
    todayPaid,
    awaitingPayment,
    waitlistCount,
  ] = await Promise.all([
    db.event.count({ where: { status: { in: ["PUBLISHED", "SOLD_OUT"] } } }),
    db.registration.count({ where: { status: { notIn: ["CANCELLED"] } } }),
    db.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.registration.count({ where: { status: "ATTENDED" } }),
    db.registration.count({ where: { status: { in: ["CONFIRMED", "ATTENDED"] } } }),
    db.registration.count({ where: { createdAt: { gte: startOfToday } } }),
    db.payment.count({ where: { status: "PAID", paidAt: { gte: startOfToday } } }),
    db.registration.count({ where: { status: "WAITING_PAYMENT" } }),
    db.registration.count({ where: { status: "WAITLIST" } }),
  ]);

  return {
    activeEvents,
    totalRegistrants,
    paidCount: paidAgg._count._all,
    revenue: paidAgg._sum.amount ?? 0,
    attendedCount,
    attendanceRate:
      confirmedish > 0 ? Math.round((attendedCount / confirmedish) * 100) : 0,
    todayRegistrations,
    todayPaid,
    awaitingPayment,
    waitlistCount,
  };
}

export type EventReportRow = {
  id: string;
  title: string;
  slug: string;
  startAt: Date;
  status: string;
  capacity: number;
  price: number;
  registrations: number;
  paid: number;
  attended: number;
  revenue: number;
  conversion: number;
};

/**
 * Per-event funnel table.
 *
 * Uses three grouped queries plus one event query (4 total) instead of a query
 * per event, so the report cost stays flat as the event count grows.
 */
export async function getEventReport(): Promise<EventReportRow[]> {
  const [events, regGroups, paidGroups, attendedGroups] = await Promise.all([
    db.event.findMany({
      orderBy: { startAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        startAt: true,
        status: true,
        capacity: true,
        price: true,
      },
    }),
    db.registration.groupBy({
      by: ["eventId"],
      where: { status: { notIn: ["CANCELLED"] } },
      _count: { _all: true },
    }),
    // Revenue and paid count per event, joined through registration.
    db.registration.findMany({
      where: { payment: { status: "PAID" } },
      select: { eventId: true, payment: { select: { amount: true } } },
    }),
    db.registration.groupBy({
      by: ["eventId"],
      where: { status: "ATTENDED" },
      _count: { _all: true },
    }),
  ]);

  const regBy = new Map(regGroups.map((g) => [g.eventId, g._count._all]));
  const attendedBy = new Map(attendedGroups.map((g) => [g.eventId, g._count._all]));

  const paidBy = new Map<string, { count: number; sum: number }>();
  for (const row of paidGroups) {
    const current = paidBy.get(row.eventId) ?? { count: 0, sum: 0 };
    current.count += 1;
    current.sum += row.payment?.amount ?? 0;
    paidBy.set(row.eventId, current);
  }

  return events.map((e) => {
    const registrations = regBy.get(e.id) ?? 0;
    const paid = paidBy.get(e.id);
    const attended = attendedBy.get(e.id) ?? 0;

    return {
      ...e,
      registrations,
      paid: paid?.count ?? 0,
      attended,
      revenue: paid?.sum ?? 0,
      conversion:
        registrations > 0
          ? Math.round(((paid?.count ?? 0) / registrations) * 100)
          : 0,
    };
  });
}

/** Upcoming events with live seat counts, for the dashboard table. */
export async function getUpcomingEventStats() {
  const events = await db.event.findMany({
    where: {
      startAt: { gte: new Date() },
      status: { in: ["PUBLISHED", "SOLD_OUT", "DRAFT", "CLOSED"] },
    },
    orderBy: { startAt: "asc" },
    take: 6,
    select: {
      id: true,
      title: true,
      slug: true,
      startAt: true,
      status: true,
      capacity: true,
    },
  });

  if (events.length === 0) return [];

  const ids = events.map((e) => e.id);

  const [regGroups, paidRows] = await Promise.all([
    db.registration.groupBy({
      by: ["eventId"],
      where: { eventId: { in: ids }, status: { in: [...SEAT_HOLDING_STATUS] } },
      _count: { _all: true },
    }),
    db.registration.groupBy({
      by: ["eventId"],
      where: { eventId: { in: ids }, payment: { status: "PAID" } },
      _count: { _all: true },
    }),
  ]);

  const regBy = new Map(regGroups.map((g) => [g.eventId, g._count._all]));
  const paidBy = new Map(paidRows.map((g) => [g.eventId, g._count._all]));

  return events.map((e) => ({
    ...e,
    registrations: regBy.get(e.id) ?? 0,
    paid: paidBy.get(e.id) ?? 0,
  }));
}

/** Acquisition-source breakdown for the growth report. */
export async function getSourceBreakdown(): Promise<
  Array<{ source: string; count: number; percent: number }>
> {
  const groups = await db.registration.groupBy({
    by: ["source"],
    where: { status: { notIn: ["CANCELLED"] } },
    _count: { _all: true },
  });

  const total = groups.reduce((sum, g) => sum + g._count._all, 0);
  if (total === 0) return [];

  return groups
    .map((g) => ({
      source: g.source ?? "Tidak diisi",
      count: g._count._all,
      percent: Math.round((g._count._all / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

/** Daily registration volume for the last N days (sparkline data). */
export async function getRegistrationTrend(
  days = 14,
): Promise<Array<{ date: string; count: number }>> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await db.$queryRaw<Array<{ day: Date; count: bigint }>>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
    FROM "Registration"
    WHERE "createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const byDay = new Map(
    rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]),
  );

  // Fill gaps so the chart has a point for every day, not just active ones.
  const out: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return out;
}
