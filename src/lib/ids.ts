/**
 * ID helpers built on the Web Crypto API (available in Node 18+ and the Edge
 * runtime). Replaces the `nanoid` dependency with ~20 lines.
 */

/** Unambiguous alphabet: no 0/O/1/I/L so humans can read codes aloud. */
const HUMAN_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomFrom(alphabet: string, length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  // Reject-free mapping: alphabet length (31) doesn't divide 256 evenly, so
  // modulo introduces a tiny bias. For non-secret display codes that's fine;
  // for the ticket token below we use a power-of-two alphabet instead.
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/**
 * Public registration code, e.g. `OTK-7QF2-M9K4`.
 * Short enough to read over the phone, long enough to not collide in practice
 * (31^8 ≈ 8.5e11). The DB still enforces uniqueness.
 */
export function registrationCode(): string {
  const a = randomFrom(HUMAN_ALPHABET, 4);
  const b = randomFrom(HUMAN_ALPHABET, 4);
  return `OTK-${a}-${b}`;
}

/**
 * Ticket token used inside the QR payload. This one is a real secret: knowing
 * it lets someone check in. 32 hex chars = 128 bits of entropy, generated
 * without modulo bias.
 */
export function ticketToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** URL-safe slug from a title, with a short suffix to guarantee uniqueness. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function slugWithSuffix(input: string): string {
  const base = slugify(input) || "event";
  return `${base}-${randomFrom("abcdefghijkmnpqrstuvwxyz23456789", 5)}`;
}
