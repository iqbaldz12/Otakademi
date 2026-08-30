import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHmac,
  type ScryptOptions,
} from "node:crypto";
import { db } from "@/server/db";
import type { AdminRole } from "@prisma/client";

/**
 * Promise wrapper around scrypt.
 *
 * Hand-written rather than `promisify` because the callback overload that takes
 * an options object isn't picked up by promisify's type definitions.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

const COOKIE = "otk_session";
const SESSION_DAYS = 7;

/** Params chosen to be slow enough to resist offline cracking. */
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // 2^14

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

/** Produces `salt:key`, both hex. Salt is unique per password. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST });
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

/** Constant-time verification, so timing can't reveal the hash. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");

  const actual = await scrypt(password, salt, expected.length, {
    N: SCRYPT_COST,
  });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------------
// Session cookie (HMAC-signed, stateless)
// ---------------------------------------------------------------------------

export type Session = {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  exp: number;
};

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    // Failing loudly beats silently signing sessions with a guessable key.
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a random 32+ character value in .env",
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(session: Session): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): Session | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;

  // Compare signatures in constant time before trusting the payload.
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const session = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Session;
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createSession(user: {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}): Promise<void> {
  const session: Session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + SESSION_DAYS * 86_400_000,
  };

  const jar = await cookies();
  jar.set(COOKIE, encode(session), {
    httpOnly: true, // not readable from JS, blunts XSS token theft
    sameSite: "lax", // survives top-level navigation, blocks cross-site POST
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return decode(token);
}

/** Guard for admin pages and actions. Redirects instead of throwing. */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * Role gate. Finance and Content roles shouldn't be able to mutate events, so
 * actions declare which roles they accept.
 */
export async function requireRole(allowed: AdminRole[]): Promise<Session> {
  const session = await requireAdmin();
  if (!allowed.includes(session.role) && session.role !== "SUPER_ADMIN") {
    redirect("/admin?denied=1");
  }
  return session;
}

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const user = await db.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Same message and comparable work either way, so responses don't reveal
  // whether an email exists.
  if (!user) {
    await verifyPassword(password, `${"0".repeat(32)}:${"0".repeat(128)}`);
    return { ok: false, reason: "Email atau password salah." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, reason: "Email atau password salah." };

  await db.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession(user);
  return { ok: true };
}

/** Records a notable admin action for troubleshooting. */
export async function audit(
  actor: string,
  action: string,
  target?: string,
  detail?: string,
): Promise<void> {
  try {
    await db.auditLog.create({ data: { actor, action, target, detail } });
  } catch (err) {
    // Auditing must never break the operation it's recording.
    console.error("[audit]", err);
  }
}
