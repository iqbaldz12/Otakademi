import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { saveImage } from "@/server/services/upload.service";

/**
 * POST /api/uploads - stores an image and returns its public path.
 *
 * Used by the admin ImageUpload component. A route handler (rather than a server
 * action) so the client can upload the file on its own and show progress before
 * the surrounding form is submitted. Restricted to roles that manage content, so
 * the endpoint can't be used as an open file drop.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  // Guard manually with getSession (returning JSON) rather than requireRole,
  // which redirects — a redirect is the wrong response for an upload endpoint.
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  if (
    session.role !== "SUPER_ADMIN" &&
    session.role !== "CONTENT" &&
    session.role !== "EVENT_ADMIN"
  ) {
    return NextResponse.json({ ok: false, reason: "Forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: "Berkas tidak ditemukan." }, { status: 400 });
  }

  const result = await saveImage(file);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
