import { NextResponse } from "next/server";
import { listPublicEvents } from "@/server/services/event.service";

/**
 * GET /api/events - public event list.
 *
 * Read-only and returns only published-visible events. Event creation is
 * intentionally not exposed here: it happens through authenticated server
 * actions in the admin, so there's no unauthenticated write path.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const events = await listPublicEvents({
    category: url.searchParams.get("category") ?? undefined,
    format: url.searchParams.get("format") ?? undefined,
    when: url.searchParams.get("when") ?? undefined,
    search: url.searchParams.get("q") ?? undefined,
  });

  // Expose a deliberate shape rather than leaking internal columns.
  const data = events.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    category: e.category,
    format: e.format,
    venue: e.venue,
    startAt: e.startAt,
    endAt: e.endAt,
    price: e.price,
    status: e.status,
    mentorName: e.mentorName,
    summary: e.summary,
    capacity: e.capacity,
    seatsTaken: e.seats.taken,
    seatsRemaining: e.seats.isUnlimited ? null : e.seats.remaining,
    isFull: e.seats.isFull,
    url: `/event/${e.slug}`,
  }));

  return NextResponse.json(
    { data, count: data.length },
    {
      headers: {
        // Short shared cache with background refresh keeps this cheap.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
