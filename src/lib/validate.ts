/**
 * Tiny form/payload validator.
 *
 * Purpose-built replacement for zod: it covers exactly the shapes this app
 * needs, returns field-keyed errors that map straight onto form inputs, and
 * adds nothing to the bundle. Runs on the server only.
 */

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors };

/** Reads a scalar out of FormData, trimming strings. */
function raw(form: FormData, key: string): string {
  const v = form.get(key);
  if (typeof v === "string") return v.trim();
  return "";
}

// ---------------------------------------------------------------------------
// Primitive rules
// ---------------------------------------------------------------------------

/**
 * Pragmatic email check. Deliberately not RFC 5322 complete: the goal is to
 * catch typos, not to reject exotic-but-legal addresses. Real verification only
 * happens when the confirmation email lands.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Indonesian mobile numbers: 08xx / +628xx / 628xx, 9-14 digits total. */
const PHONE_RE = /^(?:\+?62|0)8[1-9][0-9]{6,11}$/;

export function normalizePhone(input: string): string {
  const digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+62")) return "0" + digits.slice(3);
  if (digits.startsWith("62")) return "0" + digits.slice(2);
  return digits;
}

export function isEmail(v: string): boolean {
  return v.length <= 254 && EMAIL_RE.test(v);
}

export function isPhone(v: string): boolean {
  return PHONE_RE.test(normalizePhone(v));
}

// ---------------------------------------------------------------------------
// Registration payload
// ---------------------------------------------------------------------------

export type RegistrationInput = {
  name: string;
  email: string;
  phone: string;
  institution?: string;
  city?: string;
  occupation?: string;
  source?: string;
  referral?: string;
  promoCode?: string;
  goal?: string;
  experience?: string;
  consent: boolean;
};

export function validateRegistration(
  form: FormData,
): ValidationResult<RegistrationInput> {
  const errors: FieldErrors = {};

  const name = raw(form, "name");
  const email = raw(form, "email").toLowerCase();
  const phone = raw(form, "phone");
  const consent = form.get("consent") === "on" || form.get("consent") === "true";

  if (name.length < 2) {
    errors.name = "Nama lengkap minimal 2 karakter.";
  } else if (name.length > 120) {
    errors.name = "Nama terlalu panjang (maksimal 120 karakter).";
  }

  if (!email) {
    errors.email = "Email wajib diisi.";
  } else if (!isEmail(email)) {
    errors.email = "Format email belum benar. Contoh: nama@email.com";
  }

  if (!phone) {
    errors.phone = "Nomor WhatsApp wajib diisi.";
  } else if (!isPhone(phone)) {
    errors.phone = "Gunakan nomor Indonesia yang valid, contoh: 081234567890.";
  }

  if (!consent) {
    errors.consent = "Kamu perlu menyetujui ketentuan dan kebijakan privasi.";
  }

  const optional = (key: string, max: number): string | undefined => {
    const v = raw(form, key);
    if (!v) return undefined;
    if (v.length > max) {
      errors[key] = `Maksimal ${max} karakter.`;
      return undefined;
    }
    return v;
  };

  const institution = optional("institution", 140);
  const city = optional("city", 80);
  const occupation = optional("occupation", 80);
  const source = optional("source", 80);
  const referral = optional("referral", 60);
  const goal = optional("goal", 500);
  const experience = optional("experience", 60);
  const promoCodeRaw = optional("promoCode", 40);

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      email,
      phone: normalizePhone(phone),
      institution,
      city,
      occupation,
      source,
      referral,
      promoCode: promoCodeRaw ? promoCodeRaw.toUpperCase() : undefined,
      goal,
      experience,
      consent,
    },
  };
}

// ---------------------------------------------------------------------------
// Event payload (admin)
// ---------------------------------------------------------------------------

export type EventInput = {
  title: string;
  category: string;
  format: "ONLINE" | "OFFLINE" | "HYBRID";
  venue?: string;
  meetingLink?: string;
  startAt: Date;
  endAt: Date;
  capacity: number;
  price: number;
  mentorName?: string;
  mentorTitle?: string;
  mentorPhoto?: string;
  mentorLink?: string;
  mentorLinkLabel?: string;
  bannerImage?: string;
  bannerColor: string;
  summary?: string;
  description?: string;
  outcomes: string[];
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "SOLD_OUT" | "COMPLETED" | "CANCELLED";
};

/**
 * Parses a `datetime-local` value ("2026-09-21T19:30") as Jakarta wall-clock time.
 *
 * `new Date("2026-09-21T19:30")` would interpret the string in the *server's*
 * timezone. That happens to be correct on a WIB machine but silently shifts every
 * event by 7 hours once deployed to a UTC host. Indonesia has no daylight saving,
 * so pinning the offset to +07:00 is exact and matches how the admin form renders
 * these values via `toDatetimeLocalValue`.
 */
function parseJakartaLocal(value: string): Date {
  if (!value) return new Date(NaN);

  // Accept both "YYYY-MM-DDTHH:mm" and "...:ss".
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?$/.exec(value);
  if (!match) return new Date(value); // already carries an offset, or invalid

  const [, date, time, seconds] = match;
  return new Date(`${date}T${time}${seconds ?? ":00"}+07:00`);
}

/**
 * Accepts only an app-relative upload path like `/uploads/abc.webp`.
 *
 * The form value originates from our own upload endpoint, but validating it here
 * means a hand-crafted POST can't smuggle an external URL or a traversal string
 * into an image src.
 */
function safeMediaPath(value: string): string | undefined {
  if (!value) return undefined;
  if (!/^\/uploads\/[A-Za-z0-9._-]+$/.test(value)) return undefined;
  if (value.includes("..")) return undefined;
  return value;
}

const FORMATS = new Set(["ONLINE", "OFFLINE", "HYBRID"]);
const STATUSES = new Set([
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "SOLD_OUT",
  "COMPLETED",
  "CANCELLED",
]);
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function validateEvent(form: FormData): ValidationResult<EventInput> {
  const errors: FieldErrors = {};

  const title = raw(form, "title");
  const category = raw(form, "category");
  const formatRaw = raw(form, "format") || "ONLINE";
  const statusRaw = raw(form, "status") || "DRAFT";
  const venue = raw(form, "venue") || undefined;
  const meetingLink = raw(form, "meetingLink") || undefined;
  const mentorName = raw(form, "mentorName") || undefined;
  const mentorTitle = raw(form, "mentorTitle") || undefined;
  const mentorLinkLabel = raw(form, "mentorLinkLabel") || undefined;
  const summary = raw(form, "summary") || undefined;
  const description = raw(form, "description") || undefined;
  const bannerColor = raw(form, "bannerColor") || "#F96469";

  // Media fields come from the ImageUpload component as public /uploads paths.
  // Accept those, or leave empty; anything else is ignored to avoid injecting
  // an arbitrary URL into an <img src> or <a href>.
  const bannerImage = safeMediaPath(raw(form, "bannerImage"));
  const mentorPhoto = safeMediaPath(raw(form, "mentorPhoto"));

  // The mentor link is a public-facing URL, so only http(s) is allowed.
  const mentorLinkRaw = raw(form, "mentorLink");
  let mentorLink: string | undefined;
  if (mentorLinkRaw) {
    if (/^https?:\/\//i.test(mentorLinkRaw)) {
      try {
        new URL(mentorLinkRaw);
        mentorLink = mentorLinkRaw;
      } catch {
        errors.mentorLink = "Link mentor tidak valid.";
      }
    } else {
      errors.mentorLink = "Link harus diawali https://";
    }
  }

  if (title.length < 3) errors.title = "Judul minimal 3 karakter.";
  if (title.length > 160) errors.title = "Judul maksimal 160 karakter.";
  if (!category) errors.category = "Kategori wajib diisi.";
  if (!FORMATS.has(formatRaw)) errors.format = "Format tidak dikenal.";
  if (!STATUSES.has(statusRaw)) errors.status = "Status tidak dikenal.";
  if (!HEX_RE.test(bannerColor)) {
    errors.bannerColor = "Warna harus format hex, contoh #F96469.";
  }

  // Dates
  const startRaw = raw(form, "startAt");
  const endRaw = raw(form, "endAt");
  const startAt = parseJakartaLocal(startRaw);
  const endAt = parseJakartaLocal(endRaw);

  if (Number.isNaN(startAt.getTime())) {
    errors.startAt = "Tanggal & jam mulai wajib diisi.";
  }
  if (Number.isNaN(endAt.getTime())) {
    errors.endAt = "Tanggal & jam selesai wajib diisi.";
  }
  if (
    !Number.isNaN(startAt.getTime()) &&
    !Number.isNaN(endAt.getTime()) &&
    endAt <= startAt
  ) {
    errors.endAt = "Jam selesai harus setelah jam mulai.";
  }

  // Numbers
  const capacity = Number(raw(form, "capacity") || "0");
  const price = Number(raw(form, "price") || "0");

  if (!Number.isInteger(capacity) || capacity < 0) {
    errors.capacity = "Kuota harus angka bulat 0 atau lebih (0 = tanpa batas).";
  }
  if (!Number.isInteger(price) || price < 0) {
    errors.price = "Harga harus angka bulat 0 atau lebih (0 = gratis).";
  }

  // Format-specific requirements
  if (formatRaw === "OFFLINE" && !venue) {
    errors.venue = "Event offline butuh lokasi.";
  }
  if (formatRaw === "ONLINE" && !venue) {
    errors.venue = "Tulis platform-nya, contoh: Zoom.";
  }

  const outcomes = (raw(form, "outcomes") || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      title,
      category,
      format: formatRaw as EventInput["format"],
      venue,
      meetingLink,
      startAt,
      endAt,
      capacity,
      price,
      mentorName,
      mentorTitle,
      mentorPhoto,
      mentorLink,
      mentorLinkLabel: mentorLink ? mentorLinkLabel : undefined,
      bannerImage,
      bannerColor,
      summary,
      description,
      outcomes,
      status: statusRaw as EventInput["status"],
    },
  };
}

// ---------------------------------------------------------------------------
// Contact channel payload (admin CMS)
// ---------------------------------------------------------------------------

import { isContactIcon } from "@/lib/domain";
import type { ChannelInput } from "@/server/services/content.service";

/**
 * Validates a link target for a contact channel.
 *
 * Only the schemes we intend to render are allowed. In particular `javascript:`
 * and `data:` are rejected: a channel href is written into an <a href>, so
 * letting those through would be a stored-XSS foothold.
 */
function isSafeHref(href: string): boolean {
  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    // For http(s), make sure it actually parses as a URL.
    if (/^https?:/i.test(href)) {
      try {
        new URL(href);
      } catch {
        return false;
      }
    }
    return true;
  }
  return false;
}

export function validateChannel(form: FormData): ValidationResult<ChannelInput> {
  const errors: FieldErrors = {};

  const icon = raw(form, "icon") || "mail";
  const label = raw(form, "label");
  const value = raw(form, "value");
  const href = raw(form, "href");
  const note = raw(form, "note") || undefined;
  const primary = form.get("primary") === "on" || form.get("primary") === "true";
  const active = form.get("active") === "on" || form.get("active") === "true";

  if (!isContactIcon(icon)) errors.icon = "Ikon tidak dikenal.";
  if (label.length < 2) errors.label = "Nama kanal minimal 2 karakter.";
  if (label.length > 60) errors.label = "Nama kanal maksimal 60 karakter.";
  if (!value) errors.value = "Isi teks yang ditampilkan, contoh nomor atau email.";
  if (value.length > 120) errors.value = "Maksimal 120 karakter.";

  if (!href) {
    errors.href = "Isi tautan tujuan.";
  } else if (!isSafeHref(href)) {
    errors.href =
      "Tautan harus diawali https://, mailto:, atau tel:. Contoh: https://wa.me/62812...";
  }

  if (note && note.length > 160) errors.note = "Catatan maksimal 160 karakter.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: { icon, label, value, href, note, primary, active },
  };
}

// ---------------------------------------------------------------------------
// Landing block payload (admin CMS)
// ---------------------------------------------------------------------------

import { isLandingSection, LANDING_SECTION_META } from "@/lib/domain";
import type { BlockInput } from "@/server/services/content.service";

export function validateBlock(form: FormData): ValidationResult<BlockInput> {
  const errors: FieldErrors = {};

  const section = raw(form, "section");
  if (!isLandingSection(section)) {
    return { ok: false, errors: { section: "Seksi tidak dikenal." } };
  }

  const meta = LANDING_SECTION_META[section];
  const title = raw(form, "title");
  const body = raw(form, "body");
  const iconRaw = raw(form, "icon");
  const metaValue = raw(form, "meta") || undefined;
  const active = form.get("active") === "on" || form.get("active") === "true";

  if (title.length < 2) errors.title = `${meta.titleLabel} minimal 2 karakter.`;
  if (title.length > 160) errors.title = `${meta.titleLabel} maksimal 160 karakter.`;
  if (body.length < 2) errors.body = `${meta.bodyLabel} wajib diisi.`;
  if (body.length > 600) errors.body = `${meta.bodyLabel} maksimal 600 karakter.`;

  // STEP uses `icon` for a short number/label; keep it tidy.
  let icon: string | undefined;
  if (meta.hasIcon) {
    if (meta.iconIsGlyph) {
      icon = iconRaw || "sparkles";
    } else {
      icon = iconRaw ? iconRaw.slice(0, 4) : undefined;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      section,
      icon,
      title,
      body,
      meta: meta.hasMeta ? metaValue : undefined,
      active,
    },
  };
}
