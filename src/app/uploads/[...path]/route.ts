import { readFile, stat } from "node:fs/promises";
import { join, normalize } from "node:path";
import { UPLOAD_DIR } from "@/server/services/upload.service";

/**
 * GET /uploads/* - serves user-uploaded images.
 *
 * With `output: "standalone"`, Next only serves the `public/` files that existed
 * at build time; files written at runtime (uploads) are not picked up by the
 * static file server and would 404. This handler reads them from the uploads
 * directory (a mounted volume in production) and streams them back, so both
 * direct <img src> and the next/image optimizer (which fetches this URL
 * internally) can load them.
 */
export const runtime = "nodejs";
// Serve freshly uploaded files immediately; let the CDN/browser cache by URL.
export const dynamic = "force-dynamic";

/** Extension -> Content-Type. Mirrors the formats accepted by saveImage(). */
const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  // The route only ever stores files directly in UPLOAD_DIR (flat, random
  // names). Reject anything with nested segments so a crafted URL can't reach
  // beyond the uploads folder.
  if (!path || path.length !== 1) {
    return new Response("Not found", { status: 404 });
  }

  const filename = path[0];

  // Defence in depth: strip any traversal and confirm the resolved path stays
  // inside UPLOAD_DIR.
  const resolved = normalize(join(UPLOAD_DIR, filename));
  if (!resolved.startsWith(UPLOAD_DIR) || filename.includes("..") || filename.includes("/")) {
    return new Response("Not found", { status: 404 });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const data = await readFile(resolved);
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileStat.size),
        // Uploaded files are content-addressed by a random name and never
        // change, so they're safe to cache aggressively.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
