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

export const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
export const PUBLIC_PREFIX = "/uploads";

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

/** Certificate templates may be high-res images or a PDF, so allow more. */
const CERT_ALLOWED = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["application/pdf", "pdf"],
]);

const CERT_SIGNATURES: Array<{ ext: string; bytes: number[] }> = [
  { ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // "%PDF"
];

const CERT_MAX_BYTES = 15 * 1024 * 1024; // 15 MB for high-res templates

/**
 * Stores a certificate template (high-res PNG/JPG or PDF).
 *
 * Separate from {@link saveImage} so the stricter 4 MB / image-only rules there
 * stay intact; templates have their own allow-list, signature check, and size
 * cap, and land in /uploads so Next serves them directly.
 */
export async function saveCertificateTemplate(file: File): Promise<UploadResult> {
  if (!file || file.size === 0) {
    return { ok: false, reason: "Tidak ada file yang diunggah." };
  }
  if (file.size > CERT_MAX_BYTES) {
    return { ok: false, reason: "Ukuran template maksimal 15 MB." };
  }

  const ext = CERT_ALLOWED.get(file.type);
  if (!ext) {
    return { ok: false, reason: "Format template harus PNG, JPG, atau PDF." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sigOk = CERT_SIGNATURES.some(
    (sig) => sig.ext === ext && sig.bytes.every((b, i) => buffer[i] === b),
  );
  if (!sigOk) {
    return { ok: false, reason: "Berkas ini bukan template yang valid." };
  }

  const name = `cert-${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, name), buffer);

  return { ok: true, path: `${PUBLIC_PREFIX}/${name}` };
}

/** Reads an uploaded file (e.g. a certificate template) back as a Buffer. */
export async function readUpload(publicPath: string): Promise<Buffer | null> {
  if (!publicPath.startsWith(`${PUBLIC_PREFIX}/`)) return null;
  const filename = publicPath.slice(PUBLIC_PREFIX.length + 1);
  if (filename.includes("/") || filename.includes("..") || !filename) return null;
  try {
    const { readFile } = await import("node:fs/promises");
    return await readFile(join(UPLOAD_DIR, filename));
  } catch {
    return null;
  }
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
