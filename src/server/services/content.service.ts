import { db } from "@/server/db";
import {
  CONTACT_SETTING_KEYS,
  CONTACT_DEFAULTS,
  LANDING_SETTING_KEYS,
  LANDING_DEFAULTS,
  type ContactTopic,
  type LandingSection,
} from "@/lib/domain";
import type { ContactChannel, LandingBlock } from "@prisma/client";

// ---------------------------------------------------------------------------
// Contact channels
// ---------------------------------------------------------------------------

/** Channels for the public site: active only, in the admin's chosen order. */
export async function listPublicChannels(): Promise<ContactChannel[]> {
  return db.contactChannel.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

/** Every channel, for the admin manager. */
export async function listAllChannels(): Promise<ContactChannel[]> {
  return db.contactChannel.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export type ChannelInput = {
  icon: string;
  label: string;
  value: string;
  href: string;
  note?: string;
  primary: boolean;
  active: boolean;
};

export async function createChannel(input: ChannelInput): Promise<ContactChannel> {
  // New channels append to the end of the list.
  const last = await db.contactChannel.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return db.contactChannel.create({
    data: {
      ...input,
      note: input.note ?? null,
      sortOrder: (last?.sortOrder ?? 0) + 10,
    },
  });
}

export async function updateChannel(
  id: string,
  input: ChannelInput,
): Promise<ContactChannel> {
  return db.contactChannel.update({
    where: { id },
    data: { ...input, note: input.note ?? null },
  });
}

export async function setChannelActive(id: string, active: boolean): Promise<void> {
  await db.contactChannel.update({ where: { id }, data: { active } });
}

export async function deleteChannel(id: string): Promise<void> {
  await db.contactChannel.delete({ where: { id } });
}

/**
 * Moves a channel one step up or down.
 *
 * Swaps the two neighbours' sortOrder inside a transaction so the ordering can't
 * end up with duplicates or gaps under concurrent edits.
 */
export async function moveChannel(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const all = await db.contactChannel.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });

  const index = all.findIndex((c) => c.id === id);
  if (index === -1) return;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) return; // already at the edge

  const a = all[index];
  const b = all[swapWith];

  // If two rows share a sortOrder, give them distinct values first.
  const aOrder = a.sortOrder === b.sortOrder ? a.sortOrder + 1 : a.sortOrder;

  await db.$transaction([
    db.contactChannel.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    db.contactChannel.update({ where: { id: b.id }, data: { sortOrder: aOrder } }),
  ]);
}

// ---------------------------------------------------------------------------
// Site settings (editable copy)
// ---------------------------------------------------------------------------

/** Reads many settings at once, returning a plain key->value map. */
async function readSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await db.siteSetting.findMany({
    where: { key: { in: keys } },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export type ContactContent = {
  heroTitle: string;
  heroSubtitle: string;
  hoursTitle: string;
  hoursBody: string;
  topics: ContactTopic[];
};

/**
 * Assembles the contact page copy, falling back to sensible defaults for any
 * setting that has never been saved. That means the page renders correctly on a
 * fresh database, before the admin has touched anything.
 */
export async function getContactContent(): Promise<ContactContent> {
  const K = CONTACT_SETTING_KEYS;
  const values = await readSettings(Object.values(K));

  let topics: ContactTopic[] = CONTACT_DEFAULTS.topics;
  if (values[K.topics]) {
    try {
      const parsed = JSON.parse(values[K.topics]);
      if (Array.isArray(parsed)) topics = parsed;
    } catch {
      // Corrupt JSON falls back to defaults rather than crashing the page.
    }
  }

  return {
    heroTitle: values[K.heroTitle] ?? CONTACT_DEFAULTS.heroTitle,
    heroSubtitle: values[K.heroSubtitle] ?? CONTACT_DEFAULTS.heroSubtitle,
    hoursTitle: values[K.hoursTitle] ?? CONTACT_DEFAULTS.hoursTitle,
    hoursBody: values[K.hoursBody] ?? CONTACT_DEFAULTS.hoursBody,
    topics,
  };
}

/** Upserts a batch of settings in one transaction. */
export async function saveSettings(entries: Record<string, string>): Promise<void> {
  const ops = Object.entries(entries).map(([key, value]) =>
    db.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    }),
  );
  await db.$transaction(ops);
}

// ---------------------------------------------------------------------------
// Landing page blocks (CMS)
// ---------------------------------------------------------------------------

/** All blocks in one section, in the admin's chosen order. */
export async function listBlocks(section: LandingSection): Promise<LandingBlock[]> {
  return db.landingBlock.findMany({
    where: { section },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

/** Active blocks in one section, for the public landing page. */
export async function listPublicBlocks(
  section: LandingSection,
): Promise<LandingBlock[]> {
  return db.landingBlock.findMany({
    where: { section, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export type BlockInput = {
  section: LandingSection;
  icon?: string;
  title: string;
  body: string;
  meta?: string;
  active: boolean;
};

export async function createBlock(input: BlockInput): Promise<LandingBlock> {
  const last = await db.landingBlock.findFirst({
    where: { section: input.section },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return db.landingBlock.create({
    data: {
      section: input.section,
      icon: input.icon ?? null,
      title: input.title,
      body: input.body,
      meta: input.meta ?? null,
      active: input.active,
      sortOrder: (last?.sortOrder ?? 0) + 10,
    },
  });
}

export async function updateBlock(id: string, input: BlockInput): Promise<LandingBlock> {
  return db.landingBlock.update({
    where: { id },
    data: {
      icon: input.icon ?? null,
      title: input.title,
      body: input.body,
      meta: input.meta ?? null,
      active: input.active,
    },
  });
}

export async function setBlockActive(id: string, active: boolean): Promise<void> {
  await db.landingBlock.update({ where: { id }, data: { active } });
}

export async function deleteBlock(id: string): Promise<void> {
  await db.landingBlock.delete({ where: { id } });
}

/** Swaps a block with its neighbour within the same section. */
export async function moveBlock(id: string, direction: "up" | "down"): Promise<void> {
  const block = await db.landingBlock.findUnique({
    where: { id },
    select: { section: true },
  });
  if (!block) return;

  const all = await db.landingBlock.findMany({
    where: { section: block.section },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });

  const index = all.findIndex((b) => b.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= all.length) return;

  const a = all[index];
  const b = all[swapWith];
  const aOrder = a.sortOrder === b.sortOrder ? a.sortOrder + 1 : a.sortOrder;

  await db.$transaction([
    db.landingBlock.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    db.landingBlock.update({ where: { id: b.id }, data: { sortOrder: aOrder } }),
  ]);
}

// ---------------------------------------------------------------------------
// Landing hero + section copy
// ---------------------------------------------------------------------------

/**
 * Landing copy shape: same keys as LANDING_DEFAULTS but plain `string` values,
 * not the frozen string literals. Without this widening, comparing a saved value
 * against anything but the default literal is a type error.
 */
export type LandingCopy = { [K in keyof typeof LANDING_DEFAULTS]: string };

/** Reads the landing copy, filling any unsaved key with its default. */
export async function getLandingCopy(): Promise<LandingCopy> {
  const K = LANDING_SETTING_KEYS;
  const values = await readSettings(Object.values(K));

  // Map each default key back through its setting key.
  const out = { ...LANDING_DEFAULTS } as Record<string, string>;
  for (const [prop, key] of Object.entries(K)) {
    if (values[key] !== undefined) out[prop] = values[key];
  }
  return out as LandingCopy;
}

export type LandingContent = {
  copy: LandingCopy;
  benefits: LandingBlock[];
  steps: LandingBlock[];
  testimonials: LandingBlock[];
  faqs: LandingBlock[];
};

/** Everything the public landing page needs, in one aggregated call. */
export async function getLandingContent(): Promise<LandingContent> {
  const [copy, benefits, steps, testimonials, faqs] = await Promise.all([
    getLandingCopy(),
    listPublicBlocks("BENEFIT"),
    listPublicBlocks("STEP"),
    listPublicBlocks("TESTIMONIAL"),
    listPublicBlocks("FAQ"),
  ]);
  return { copy, benefits, steps, testimonials, faqs };
}
