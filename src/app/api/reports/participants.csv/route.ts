import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { listRegistrations, toCsv } from "@/server/services/registration.service";

/**
 * CSV export of participants, honouring the same filters as the admin table.
 *
 * Auth is checked explicitly: this is a route handler, so it does not inherit the
 * /admin layout's gate. Without this check anyone could download the full
 * participant list, including emails and phone numbers.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);

  const rows = await listRegistrations({
    eventId: url.searchParams.get("eventId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    paymentStatus: url.searchParams.get("paymentStatus") ?? undefined,
    search: url.searchParams.get("q") ?? undefined,
  });

  const csv = toCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="otakademi-peserta-${stamp}.csv"`,
      // Participant data must never be cached by a CDN or shared proxy.
      "Cache-Control": "no-store, private",
    },
  });
}
