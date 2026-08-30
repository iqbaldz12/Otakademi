import { db } from "@/server/db";
import { slugWithSuffix } from "@/lib/ids";
import { deleteUpload } from "@/server/services/upload.service";
import {
  PUBLIC_VISIBLE_STATUS,
  isPubliclyVisible,
  seatInfo,
  type SeatInfo,
} from "@/lib/domain";
import type { EventInput } from "@/lib/validate";
import type { Event, EventStatus, Prisma } from "@prisma/client";

/**
 * Registration statuses that occupy a seat.
 *
 * WAITING_PAYMENT counts as taken so an unpaid-but-in-flight registration can't
 * be oversold out from under the user. Expiring a payment releases the seat.
 */
export const SEAT_HOLDING_STATUS = [
  "PENDING",
  "WAITING_PAYMENT",
  "CONFIRMED",
  "ATTENDED",
  "NO_SHOW",
] as const;

export type EventWithSeats = Event & { seats: SeatInfo };

/** Attaches live seat counts to events using one grouped query, not N+1. */
async function withSeats(events: Event[]): Promise<EventWithSeats[]> {
  if (events.length === 0) return [];

  const counts = await db.registration.groupBy({
    by: ["eventId"],
    where: {
      eventId: { in: events.map((e) => e.id) },
      status: { in: [...SEAT_HOLDING_STATUS] },
    },
    _count: { _all: true },
  });

  const takenBy = new Map(counts.map((c) => [c.eventId, c._count._all]));

  return events.map((e) => ({
    ...e,
    seats: seatInfo(e.capacity, takenBy.get(e.id) ?? 0),
  }));
}

export type ListEventsFilter = {
  category?: string;
  format?: string;
  /** "upcoming" | "past" | "free" | "paid" */
  when?: string;
  search?: string;
};

/** Public event listing. Only statuses the public is allowed to see. */
export async function listPublicEvents(
  filter: ListEventsFilter = {},
): Promise<EventWithSeats[]> {
  const where: Prisma.EventWhereInput = {
    status: { in: PUBLIC_VISIBLE_STATUS as EventStatus[] },
  };

  if (filter.category) where.category = filter.category;
  if (filter.format === "ONLINE" || filter.format === "OFFLINE" || filter.format === "HYBRID") {
    where.format = filter.format;
  }

  const now = new Date();
  if (filter.when === "upcoming") where.startAt = { gte: now };
  if (filter.when === "past") where.startAt = { lt: now };
  if (filter.when === "free") where.price = 0;
  if (filter.when === "paid") where.price = { gt: 0 };

  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: "insensitive" } },
      { summary: { contains: filter.search, mode: "insensitive" } },
      { category: { contains: filter.search, mode: "insensitive" } },
      { mentorName: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  const events = await db.event.findMany({
    where,
    orderBy: [{ startAt: "asc" }],
  });

  return withSeats(events);
}

/** Featured events for the landing page: next N live events. */
export async function listFeaturedEvents(limit = 3): Promise<EventWithSeats[]> {
  const events = await db.event.findMany({
    where: {
      status: { in: ["PUBLISHED", "SOLD_OUT"] },
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    take: limit,
  });
  return withSeats(events);
}

export async function getEventBySlug(
  slug: string,
): Promise<EventWithSeats | null> {
  const event = await db.event.findUnique({ where: { slug } });
  if (!event) return null;

  // Hidden statuses must not be reachable by guessing or sharing the URL either,
  // otherwise "non-aktif" would only hide the event from the listing.
  if (!isPubliclyVisible(event.status)) return null;

  const [withSeat] = await withSeats([event]);
  return withSeat;
}

export async function getEventById(
  id: string,
): Promise<EventWithSeats | null> {
  const event = await db.event.findUnique({ where: { id } });
  if (!event) return null;
  const [withSeat] = await withSeats([event]);
  return withSeat;
}

/** Admin listing: every status, newest first, with seat counts. */
export async function listAllEvents(): Promise<EventWithSeats[]> {
  const events = await db.event.findMany({
    orderBy: [{ startAt: "desc" }],
  });
  return withSeats(events);
}

export async function createEvent(input: EventInput): Promise<Event> {
  return db.event.create({
    data: {
      title: input.title,
      slug: slugWithSuffix(input.title),
      category: input.category,
      format: input.format,
      venue: input.venue,
      meetingLink: input.meetingLink,
      startAt: input.startAt,
      endAt: input.endAt,
      capacity: input.capacity,
      price: input.price,
      status: input.status,
      mentorName: input.mentorName,
      mentorTitle: input.mentorTitle,
      mentorPhoto: input.mentorPhoto,
      mentorLink: input.mentorLink,
      mentorLinkLabel: input.mentorLinkLabel,
      bannerImage: input.bannerImage,
      bannerColor: input.bannerColor,
      summary: input.summary,
      description: input.description,
      outcomes: input.outcomes,
    },
  });
}

export async function updateEvent(
  id: string,
  input: EventInput,
): Promise<Event> {
  // If a media field changed, delete the file it replaced so orphans don't pile
  // up on disk. Reads the old paths first, then removes them after the update
  // succeeds.
  const previous = await db.event.findUnique({
    where: { id },
    select: { bannerImage: true, mentorPhoto: true },
  });

  const updated = await db.event.update({
    where: { id },
    data: {
      title: input.title,
      category: input.category,
      format: input.format,
      venue: input.venue,
      meetingLink: input.meetingLink,
      startAt: input.startAt,
      endAt: input.endAt,
      capacity: input.capacity,
      price: input.price,
      status: input.status,
      mentorName: input.mentorName,
      mentorTitle: input.mentorTitle,
      mentorPhoto: input.mentorPhoto,
      mentorLink: input.mentorLink,
      mentorLinkLabel: input.mentorLinkLabel,
      bannerImage: input.bannerImage,
      bannerColor: input.bannerColor,
      summary: input.summary,
      description: input.description,
      outcomes: input.outcomes,
    },
  });

  if (previous?.bannerImage && previous.bannerImage !== input.bannerImage) {
    await deleteUpload(previous.bannerImage);
  }
  if (previous?.mentorPhoto && previous.mentorPhoto !== input.mentorPhoto) {
    await deleteUpload(previous.mentorPhoto);
  }

  return updated;
}

/**
 * The admin Switch calls this.
 *
 * `active = true`  -> PUBLISHED (open for registration, visible publicly)
 * `active = false` -> CLOSED    (still visible, registration shut)
 *
 * Terminal states (COMPLETED / CANCELLED) are intentionally not togglable:
 * silently reopening a cancelled event would be surprising and could take
 * money for something that isn't happening.
 */
export async function setEventActive(
  id: string,
  active: boolean,
): Promise<
  | { ok: true; status: EventStatus; slug: string }
  | { ok: false; reason: string }
> {
  const event = await db.event.findUnique({
    where: { id },
    // slug comes back so the caller can revalidate the event's own detail page.
    select: { id: true, status: true, slug: true },
  });

  if (!event) return { ok: false, reason: "Event tidak ditemukan." };

  if (event.status === "COMPLETED") {
    return { ok: false, reason: "Event sudah selesai dan tidak bisa diaktifkan." };
  }
  if (event.status === "CANCELLED") {
    return { ok: false, reason: "Event dibatalkan. Pulihkan lewat menu Edit." };
  }

  const nextStatus: EventStatus = active ? "PUBLISHED" : "CLOSED";
  await db.event.update({ where: { id }, data: { status: nextStatus } });
  return { ok: true, status: nextStatus, slug: event.slug };
}

export async function deleteEvent(
  id: string,
): Promise<{ ok: true; slug: string } | { ok: false; reason: string }> {
  const event = await db.event.findUnique({
    where: { id },
    select: { slug: true, bannerImage: true, mentorPhoto: true },
  });
  if (!event) return { ok: false, reason: "Event tidak ditemukan." };

  const count = await db.registration.count({
    where: {
      eventId: id,
      status: { in: ["CONFIRMED", "ATTENDED", "WAITING_PAYMENT"] },
    },
  });

  // Deleting would cascade away real participants and payment history.
  if (count > 0) {
    return {
      ok: false,
      reason: `Event punya ${count} pendaftar aktif. Batalkan event ini daripada menghapusnya.`,
    };
  }

  await db.event.delete({ where: { id } });

  // Free the associated media so deleted events don't leave files behind.
  await deleteUpload(event.bannerImage);
  await deleteUpload(event.mentorPhoto);

  return { ok: true, slug: event.slug };
}

/** Marks an event cancelled and releases everyone still holding a seat. */
export async function cancelEvent(id: string): Promise<{ slug: string } | null> {
  const event = await db.event.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!event) return null;

  await db.$transaction([
    db.event.update({ where: { id }, data: { status: "CANCELLED" } }),
    db.registration.updateMany({
      where: {
        eventId: id,
        status: { in: ["PENDING", "WAITING_PAYMENT", "CONFIRMED", "WAITLIST"] },
      },
      data: { status: "CANCELLED" },
    }),
  ]);

  return { slug: event.slug };
}

export async function listCategories(): Promise<string[]> {
  const rows = await db.event.findMany({
    where: { status: { in: PUBLIC_VISIBLE_STATUS as EventStatus[] } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}
