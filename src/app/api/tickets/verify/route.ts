import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { checkInByToken } from "@/server/services/ticket.service";

/**
 * POST /api/tickets/verify - check a participant in from a scanned QR.
 *
 * Exists as a route handler (not just a server action) so a dedicated scanner
 * device or a future PWA can call it directly. Requires an admin session: this
 * mutates attendance.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const result = await checkInByToken(body.token);

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    alreadyCheckedIn: result.alreadyCheckedIn,
    name: result.name,
    event: result.eventTitle,
    code: result.code,
    at: result.at,
  });
}
