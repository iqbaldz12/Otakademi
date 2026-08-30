/**
 * Formatting helpers.
 *
 * Intl formatters are expensive to construct, so they're created once at module
 * scope and reused. All dates render in Asia/Jakarta so server and client agree
 * regardless of where the server runs (avoids hydration mismatches).
 */

const TZ = "Asia/Jakarta";

const idrFull = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFmt = new Intl.NumberFormat("id-ID");

const dateLong = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TZ,
});

const dateMedium = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TZ,
});

const dateShort = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: TZ,
});

const timeFmt = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TZ,
});

const dateTimeShort = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TZ,
});

/** `Rp79.000`, or `Gratis` when the price is zero. */
export function formatPrice(amount: number): string {
  if (amount <= 0) return "Gratis";
  return idrFull.format(amount).replace(/\s/g, "");
}

/** Always renders currency, even for 0. Used in finance/report views. */
export function formatIDR(amount: number): string {
  return idrFull.format(amount).replace(/\s/g, "");
}

/** Compact money for stat cards: `Rp24,8 jt`. */
export function formatCompactIDR(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp${(amount / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp${(amount / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }
  if (amount >= 1_000) {
    return `Rp${Math.round(amount / 1_000)} rb`;
  }
  return formatIDR(amount);
}

export function formatNumber(n: number): string {
  return numberFmt.format(n);
}

export const fmtDateLong = (d: Date) => dateLong.format(d);
export const fmtDateMedium = (d: Date) => dateMedium.format(d);
export const fmtDateShort = (d: Date) => dateShort.format(d);
export const fmtTime = (d: Date) => timeFmt.format(d).replace(".", ":");
export const fmtDateTimeShort = (d: Date) =>
  dateTimeShort.format(d).replace(/\.(\d{2})$/, ":$1");

/** `19:30 - 21:30 WIB` */
export function formatTimeRange(start: Date, end: Date): string {
  return `${fmtTime(start)} - ${fmtTime(end)} WIB`;
}

/** Value for a `datetime-local` input, expressed in Jakarta time. */
export function toDatetimeLocalValue(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Human relative time, e.g. `3 hari lagi`, `2 jam lalu`. */
export function formatRelative(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime();
  const future = diffMs > 0;
  const abs = Math.abs(diffMs);

  const mins = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);

  let phrase: string;
  if (mins < 1) return "baru saja";
  if (mins < 60) phrase = `${mins} menit`;
  else if (hours < 24) phrase = `${hours} jam`;
  else if (days < 30) phrase = `${days} hari`;
  else phrase = `${Math.round(days / 30)} bulan`;

  return future ? `${phrase} lagi` : `${phrase} lalu`;
}

/** Countdown parts for the event-detail urgency strip. */
export function daysUntil(target: Date, now: Date = new Date()): number {
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

/** Builds an ICS data URL so "add to calendar" needs no extra request. */
export function buildIcsDataUrl(input: {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  uid: string;
}): string {
  const stamp = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Otakademi//Event//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.uid}@otakademi.id`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(input.start)}`,
    `DTEND:${stamp(input.end)}`,
    `SUMMARY:${escape(input.title)}`,
    `DESCRIPTION:${escape(input.description)}`,
    `LOCATION:${escape(input.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
