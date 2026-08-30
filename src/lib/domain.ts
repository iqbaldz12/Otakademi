/**
 * Domain vocabulary shared by server and client.
 *
 * Pure data + pure functions only: safe to import into client components
 * without dragging Prisma or Node APIs into the browser bundle.
 */

export const EVENT_STATUS = [
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "SOLD_OUT",
  "COMPLETED",
  "CANCELLED",
] as const;
export type EventStatusName = (typeof EVENT_STATUS)[number];

export const REGISTRATION_STATUS = [
  "PENDING",
  "WAITING_PAYMENT",
  "CONFIRMED",
  "WAITLIST",
  "CANCELLED",
  "ATTENDED",
  "NO_SHOW",
] as const;
export type RegistrationStatusName = (typeof REGISTRATION_STATUS)[number];

export const PAYMENT_STATUS = [
  "UNPAID",
  "PENDING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
] as const;
export type PaymentStatusName = (typeof PAYMENT_STATUS)[number];

export type BadgeTone = "gold" | "coral" | "navy" | "green" | "grey";

/** Indonesian labels + badge tone for every status the UI can render. */
export const EVENT_STATUS_META: Record<
  EventStatusName,
  { label: string; tone: BadgeTone }
> = {
  DRAFT: { label: "Draft", tone: "grey" },
  PUBLISHED: { label: "Aktif", tone: "green" },
  CLOSED: { label: "Non-aktif", tone: "grey" },
  SOLD_OUT: { label: "Kuota Penuh", tone: "coral" },
  COMPLETED: { label: "Selesai", tone: "navy" },
  CANCELLED: { label: "Dibatalkan", tone: "coral" },
};

export const REGISTRATION_STATUS_META: Record<
  RegistrationStatusName,
  { label: string; tone: BadgeTone }
> = {
  PENDING: { label: "Menunggu", tone: "grey" },
  WAITING_PAYMENT: { label: "Menunggu Bayar", tone: "gold" },
  CONFIRMED: { label: "Terkonfirmasi", tone: "green" },
  WAITLIST: { label: "Waitlist", tone: "navy" },
  CANCELLED: { label: "Dibatalkan", tone: "coral" },
  ATTENDED: { label: "Hadir", tone: "green" },
  NO_SHOW: { label: "Tidak Hadir", tone: "coral" },
};

export const PAYMENT_STATUS_META: Record<
  PaymentStatusName,
  { label: string; tone: BadgeTone }
> = {
  UNPAID: { label: "Belum Bayar", tone: "grey" },
  PENDING: { label: "Diproses", tone: "gold" },
  PAID: { label: "Lunas", tone: "green" },
  FAILED: { label: "Gagal", tone: "coral" },
  EXPIRED: { label: "Kedaluwarsa", tone: "coral" },
  REFUNDED: { label: "Dikembalikan", tone: "navy" },
};

export const EVENT_FORMAT_META = {
  ONLINE: { label: "Online", icon: "monitor" },
  OFFLINE: { label: "Offline", icon: "pin" },
  HYBRID: { label: "Hybrid", icon: "globe" },
} as const;
export type EventFormatName = keyof typeof EVENT_FORMAT_META;

/** Curated categories; kept as data so the filter UI stays in sync. */
export const EVENT_CATEGORIES = [
  "AI & Teknologi",
  "Cara Berpikir",
  "Karier",
  "Komunikasi",
  "Bisnis",
  "Kreatif",
] as const;

/** Preset accent colours offered in the admin event form. */
export const BANNER_PRESETS = [
  { name: "Coral", value: "#F96469" },
  { name: "Gold", value: "#FCA90A" },
  { name: "Navy", value: "#1A2C4E" },
  { name: "Sky", value: "#5BC8E8" },
  { name: "Mint", value: "#34D399" },
  { name: "Violet", value: "#8B7CF6" },
] as const;

export const SOURCE_OPTIONS = [
  "Instagram",
  "TikTok",
  "LinkedIn",
  "Teman / Rekomendasi",
  "Kampus / Sekolah",
  "Google",
  "Lainnya",
] as const;

export const EXPERIENCE_OPTIONS = [
  "Baru mulai",
  "Pernah coba sedikit",
  "Sudah cukup terbiasa",
  "Sudah mahir",
] as const;

// ---------------------------------------------------------------------------
// CMS: contact channels + editable page copy
// ---------------------------------------------------------------------------

/**
 * Icons an admin may pick for a contact channel.
 *
 * A fixed allow-list rather than free text: the value maps directly to an
 * <Icon name> that must exist, and letting arbitrary strings through would risk
 * rendering nothing. Each entry also carries a friendly label for the dropdown.
 */
export const CONTACT_ICON_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "mail", label: "Email / Amplop" },
  { value: "external", label: "Tautan / Sosial Media" },
  { value: "globe", label: "Website" },
  { value: "users", label: "Komunitas" },
  { value: "info", label: "Info" },
  { value: "pin", label: "Lokasi" },
  { value: "chart", label: "Lainnya" },
] as const;

export type ContactIconName = (typeof CONTACT_ICON_OPTIONS)[number]["value"];

const CONTACT_ICON_SET = new Set<string>(
  CONTACT_ICON_OPTIONS.map((o) => o.value),
);

export function isContactIcon(value: string): value is ContactIconName {
  return CONTACT_ICON_SET.has(value);
}

/**
 * Keys for editable copy on the contact page.
 *
 * Centralised so the admin editor, the public page, and the seed all agree on
 * the same set. `topics` holds a JSON array of {title, body}.
 */
export const CONTACT_SETTING_KEYS = {
  heroTitle: "contact.hero.title",
  heroSubtitle: "contact.hero.subtitle",
  hoursTitle: "contact.hours.title",
  hoursBody: "contact.hours.body",
  topics: "contact.topics",
} as const;

export type ContactTopic = { title: string; body: string };

// ---------------------------------------------------------------------------
// Landing page CMS
// ---------------------------------------------------------------------------

export const LANDING_SECTIONS = [
  "BENEFIT",
  "STEP",
  "TESTIMONIAL",
  "FAQ",
] as const;
export type LandingSection = (typeof LANDING_SECTIONS)[number];

export function isLandingSection(v: string): v is LandingSection {
  return (LANDING_SECTIONS as readonly string[]).includes(v);
}

/** Admin-facing metadata for each landing section: labels + which fields apply. */
export const LANDING_SECTION_META: Record<
  LandingSection,
  {
    label: string;
    singular: string;
    /** Field labels tailored to the section. */
    titleLabel: string;
    bodyLabel: string;
    hasIcon: boolean;
    hasMeta: boolean;
    metaLabel?: string;
    /** icon field is a picked glyph (BENEFIT) vs free text step number (STEP). */
    iconIsGlyph: boolean;
  }
> = {
  BENEFIT: {
    label: "Kenapa Otakademi (Keunggulan)",
    singular: "Keunggulan",
    titleLabel: "Judul",
    bodyLabel: "Deskripsi",
    hasIcon: true,
    hasMeta: false,
    iconIsGlyph: true,
  },
  STEP: {
    label: "Cara Kerja (Langkah)",
    singular: "Langkah",
    titleLabel: "Judul langkah",
    bodyLabel: "Penjelasan",
    hasIcon: true,
    hasMeta: false,
    iconIsGlyph: false, // icon holds the step number, e.g. "01"
  },
  TESTIMONIAL: {
    label: "Kata Peserta (Testimoni)",
    singular: "Testimoni",
    titleLabel: "Nama peserta",
    bodyLabel: "Kutipan",
    hasIcon: false,
    hasMeta: true,
    metaLabel: "Peran / jabatan",
    iconIsGlyph: false,
  },
  FAQ: {
    label: "FAQ Landing",
    singular: "Pertanyaan",
    titleLabel: "Pertanyaan",
    bodyLabel: "Jawaban",
    hasIcon: false,
    hasMeta: false,
    iconIsGlyph: false,
  },
};

/** Glyphs offered for BENEFIT cards. Maps to <Icon name>. */
export const BENEFIT_ICON_OPTIONS = [
  { value: "target", label: "Target" },
  { value: "clock", label: "Jam" },
  { value: "users", label: "Orang" },
  { value: "sparkles", label: "Kilau" },
  { value: "brain", label: "Otak" },
  { value: "check-circle", label: "Centang" },
  { value: "chart", label: "Grafik" },
  { value: "star", label: "Bintang" },
] as const;

export const LANDING_SETTING_KEYS = {
  heroBadge: "landing.hero.badge",
  heroTitleLine1: "landing.hero.title1",
  heroTitleLine2: "landing.hero.title2",
  heroSubtitle: "landing.hero.subtitle",
  heroPrimaryCta: "landing.hero.cta_primary",
  benefitsTitle: "landing.benefits.title",
  benefitsSubtitle: "landing.benefits.subtitle",
  stepsTitle: "landing.steps.title",
  stepsSubtitle: "landing.steps.subtitle",
  testimonialsTitle: "landing.testimonials.title",
  faqTitle: "landing.faq.title",
  ctaTitle: "landing.cta.title",
  ctaSubtitle: "landing.cta.subtitle",
} as const;

export const LANDING_DEFAULTS = {
  heroBadge: "Learn · Think · Try",
  heroTitleLine1: "Upgrade Skill.",
  heroTitleLine2: "Upgrade Cara Mikir.",
  heroSubtitle:
    "Kelas dan event praktis untuk generasi muda yang ingin berpikir lebih jernih, punya skill relevan, dan lebih siap menghadapi dunia kerja.",
  heroPrimaryCta: "Cari Kelas",
  benefitsTitle: "Kenapa Otakademi?",
  benefitsSubtitle:
    "Bukan sekadar nambah sertifikat. Fokusnya bikin kamu benar-benar bisa mengerjakan sesuatu setelah kelas selesai.",
  stepsTitle: "Cara Kerjanya",
  stepsSubtitle: "Dari nemu kelas sampai duduk di sesinya, empat langkah saja.",
  testimonialsTitle: "Kata Peserta",
  faqTitle: "Pertanyaan yang Sering Muncul",
  ctaTitle: "Siap upgrade cara mikir?",
  ctaSubtitle:
    "Pilih satu kelas yang paling relevan buat kamu sekarang. Mulai dari gratis.",
} as const;

/** Defaults used when a setting has never been saved (first run / fresh DB). */
export const CONTACT_DEFAULTS = {
  heroTitle: "Hubungi Kami",
  heroSubtitle:
    "Ada pertanyaan soal kelas, pembayaran, atau kerja sama? Pilih kanal yang paling nyaman untuk kamu.",
  hoursTitle: "Jam Operasional",
  hoursBody:
    "Senin-Jumat, 09.00-17.00 WIB. Pesan yang masuk di luar jam tersebut kami balas pada hari kerja berikutnya. Saat event berlangsung, respons bisa lebih lambat.",
  topics: [
    {
      title: "Soal pendaftaran atau tiket",
      body: "Sertakan kode pendaftaran kamu (format OTK-XXXX-XXXX) supaya kami bisa langsung cek datanya.",
    },
    {
      title: "Konfirmasi pembayaran",
      body: "Kirim bukti transfer beserta kode pendaftaran lewat WhatsApp. Verifikasi dilakukan pada jam kerja.",
    },
    {
      title: "Kerja sama institusi",
      body: "Ceritakan jumlah peserta, topik yang dibutuhkan, dan perkiraan jadwal. Kami balas dengan penawaran.",
    },
    {
      title: "Jadi mentor",
      body: "Kirim profil singkat dan bidang keahlianmu lewat email. Kami hubungi kalau ada kelas yang cocok.",
    },
  ] as ContactTopic[],
} as const;

/**
 * "Is this event open for new registrations right now?"
 *
 * The admin Switch flips PUBLISHED <-> CLOSED, so this is the single source of
 * truth both the switch and the public pages read.
 */
export function isEventLive(status: EventStatusName): boolean {
  return status === "PUBLISHED";
}
export const PUBLIC_VISIBLE_STATUS: EventStatusName[] = [
  "PUBLISHED",
  "SOLD_OUT",
  "COMPLETED",
];

/** Statuses that are hidden from every public surface (listing, detail, sitemap). */
export const PUBLIC_HIDDEN_STATUS: EventStatusName[] = [
  "DRAFT",
  "CLOSED",
  "CANCELLED",
];

export function isPubliclyVisible(status: EventStatusName): boolean {
  return PUBLIC_VISIBLE_STATUS.includes(status);
}

export type SeatInfo = {
  capacity: number;
  taken: number;
  remaining: number;
  isUnlimited: boolean;
  isFull: boolean;
  /** 0-100, for the capacity meter. */
  percentFull: number;
  /** Nudge shown when seats are genuinely running low. */
  scarcity: "none" | "low" | "critical" | "full";
};

export function seatInfo(capacity: number, taken: number): SeatInfo {
  const isUnlimited = capacity <= 0;
  const remaining = isUnlimited ? Infinity : Math.max(0, capacity - taken);
  const isFull = !isUnlimited && remaining === 0;
  const percentFull = isUnlimited
    ? 0
    : Math.min(100, Math.round((taken / capacity) * 100));

  let scarcity: SeatInfo["scarcity"] = "none";
  if (isFull) scarcity = "full";
  else if (!isUnlimited && remaining <= 5) scarcity = "critical";
  else if (!isUnlimited && percentFull >= 75) scarcity = "low";

  return { capacity, taken, remaining, isUnlimited, isFull, percentFull, scarcity };
}

/** Applies a promo to a base price, clamped so it can never go negative. */
export function applyPromo(
  price: number,
  promo: { type: "FIXED" | "PERCENT"; value: number } | null,
): { final: number; discount: number } {
  if (!promo || price <= 0) return { final: price, discount: 0 };

  const discount =
    promo.type === "PERCENT"
      ? Math.round((price * promo.value) / 100)
      : promo.value;

  const clamped = Math.min(discount, price);
  return { final: price - clamped, discount: clamped };
}
