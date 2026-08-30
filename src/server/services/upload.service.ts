import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Local file storage for uploaded images.
 *
 * The MVP stores media on the local filesystem under public/uploads, which Next
 * serves directly. The interface (accept a File, return a public path) is small
 * on purpose: swapping to S3/R2 later means rewriting only this file, not any
 * caller. On a multi-instance or serverless host this must move to object
 * storage, since the local disk isn't shared or persistent.
 */

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const PUBLIC_PREFIX = "/uploads";

/** Accepted image types mapped to their canonical extension. */
const ALLOWED = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

/** Magic-byte signatures, so a renamed .exe can't masquerade as an image. */
const SIGNATURES: Array<{ ext: string; bytes: number[] }> = [
  { ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
  { ext: "gif", bytes: [0x47, 0x49, 0x46, 0x38] }, // "GIF8"
];

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export type UploadResult =
  | { ok: true; path: string }
  | { ok: false; reason: string };

function matchesSignature(buffer: Buffer, declaredExt: string): boolean {
  return SIGNATURES.some(
    (sig) =>
      sig.ext === declaredExt &&
      sig.bytes.every((b, i) => buffer[i] === b),
  );
}

/**
 * Validates and stores an uploaded image, returning its public path.
 *
 * Defence in depth: the MIME type, the byte size, and the file's magic bytes are
 * all checked before anything touches disk, and the filename is generated from
 * random bytes so a caller can never influence the write path (no traversal, no
 * overwrite of an existing file).
 */
export async function saveImage(file: File): Promise<UploadResult> {
  if (!file || file.size === 0) {
    return { ok: false, reason: "Tidak ada file yang diunggah." };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, reason: "Ukuran gambar maksimal 4 MB." };
  }

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return {
      ok: false,
      reason: "Format harus PNG, JPG, WEBP, atau GIF.",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!matchesSignature(buffer, ext)) {
    return { ok: false, reason: "Berkas ini bukan gambar yang valid." };
  }

  // Random, non-guessable name. Never derived from the client filename.
  const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, name), buffer);

  return { ok: true, path: `${PUBLIC_PREFIX}/${name}` };
}

/**
 * Deletes a previously uploaded file when a record stops referencing it.
 *
 * Only touches paths under /uploads and strips any directory component, so it
 * can never be tricked into removing files elsewhere.
 */
export async function deleteUpload(publicPath: string | null | undefined): Promise<void> {
  if (!publicPath || !publicPath.startsWith(`${PUBLIC_PREFIX}/`)) return;

  const filename = publicPath.slice(PUBLIC_PREFIX.length + 1);
  // Reject anything that tries to escape the folder.
  if (filename.includes("/") || filename.includes("..") || !filename) return;

  try {
    await unlink(join(UPLOAD_DIR, filename));
  } catch {
    // Missing file is fine; nothing else should block the delete.
  }
}
