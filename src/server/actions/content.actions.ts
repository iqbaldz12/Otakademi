"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, audit } from "@/server/auth";
import { validateChannel, type FieldErrors } from "@/lib/validate";
import {
  createChannel,
  updateChannel,
  setChannelActive,
  deleteChannel,
  moveChannel,
  saveSettings,
} from "@/server/services/content.service";
import {
  CONTACT_SETTING_KEYS,
  type ContactTopic,
} from "@/lib/domain";

/**
 * Content is Content/Marketing (and Super Admin) territory, so these actions are
 * gated by role rather than plain admin. requireRole redirects other roles away.
 */
const CONTENT_ROLES = ["CONTENT", "SUPER_ADMIN"] as const;

/** Repaints both public surfaces a contact change can touch. */
function revalidateContactSurfaces() {
  revalidatePath("/kontak");
  revalidatePath("/", "layout"); // footer lives in the shared layout
  revalidatePath("/admin/konten");
}

export type ChannelFormState = {
  ok: boolean;
  errors?: FieldErrors;
  message?: string;
};

export async function saveChannelAction(
  channelId: string | null,
  _prev: ChannelFormState,
  form: FormData,
): Promise<ChannelFormState> {
  const session = await requireRole([...CONTENT_ROLES]);

  const parsed = validateChannel(form);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, message: "Periksa kembali isian." };
  }

  if (channelId) {
    await updateChannel(channelId, parsed.data);
    await audit(session.email, "channel.update", channelId, parsed.data.label);
  } else {
    const created = await createChannel(parsed.data);
    await audit(session.email, "channel.create", created.id, parsed.data.label);
  }

  revalidateContactSurfaces();
  redirect("/admin/konten?saved=1");
}

export async function toggleChannelAction(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; reason?: string }> {
  await requireRole([...CONTENT_ROLES]);
  await setChannelActive(id, active);
  revalidateContactSurfaces();
  return { ok: true };
}

export async function deleteChannelAction(
  id: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await requireRole([...CONTENT_ROLES]);
  await deleteChannel(id);
  await audit(session.email, "channel.delete", id);
  revalidateContactSurfaces();
  return { ok: true };
}

export async function moveChannelAction(
  id: string,
  direction: "up" | "down",
): Promise<{ ok: boolean; reason?: string }> {
  await requireRole([...CONTENT_ROLES]);
  await moveChannel(id, direction);
  revalidateContactSurfaces();
  return { ok: true };
}

export type CopyFormState = { ok: boolean; message?: string };

/**
 * Saves the contact-page copy, including the variable-length topics list.
 *
 * Topics arrive as parallel `topicTitle`/`topicBody` arrays from the form; empty
 * rows are dropped so a blank slot doesn't render as an empty card.
 */
export async function saveContactCopyAction(
  _prev: CopyFormState,
  form: FormData,
): Promise<CopyFormState> {
  const session = await requireRole([...CONTENT_ROLES]);

  const heroTitle = String(form.get("heroTitle") ?? "").trim();
  const heroSubtitle = String(form.get("heroSubtitle") ?? "").trim();
  const hoursTitle = String(form.get("hoursTitle") ?? "").trim();
  const hoursBody = String(form.get("hoursBody") ?? "").trim();

  if (!heroTitle) return { ok: false, message: "Judul halaman wajib diisi." };

  const titles = form.getAll("topicTitle").map((v) => String(v).trim());
  const bodies = form.getAll("topicBody").map((v) => String(v).trim());

  const topics: ContactTopic[] = titles
    .map((title, i) => ({ title, body: bodies[i] ?? "" }))
    .filter((t) => t.title || t.body)
    .slice(0, 12);

  const K = CONTACT_SETTING_KEYS;
  await saveSettings({
    [K.heroTitle]: heroTitle,
    [K.heroSubtitle]: heroSubtitle,
    [K.hoursTitle]: hoursTitle,
    [K.hoursBody]: hoursBody,
    [K.topics]: JSON.stringify(topics),
  });

  await audit(session.email, "content.contact.save", "kontak");
  revalidateContactSurfaces();

  return { ok: true, message: "Konten halaman kontak tersimpan." };
}

// ---------------------------------------------------------------------------
// Landing page CMS
// ---------------------------------------------------------------------------

import { validateBlock } from "@/lib/validate";
import {
  createBlock,
  updateBlock,
  setBlockActive,
  deleteBlock,
  moveBlock,
} from "@/server/services/content.service";
import { LANDING_SETTING_KEYS } from "@/lib/domain";

/** Repaints the landing page and the admin editor after a content change. */
function revalidateLandingSurfaces() {
  revalidatePath("/");
  revalidatePath("/admin/konten");
}

export type BlockFormState = {
  ok: boolean;
  errors?: FieldErrors;
  message?: string;
};

/**
 * Create/update a landing block. Bound with the section and optional id by the
 * caller, so one action serves every section and both modes.
 */
export async function saveBlockAction(
  blockId: string | null,
  _prev: BlockFormState,
  form: FormData,
): Promise<BlockFormState> {
  const session = await requireRole([...CONTENT_ROLES]);

  const parsed = validateBlock(form);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, message: "Periksa kembali isian." };
  }

  if (blockId) {
    await updateBlock(blockId, parsed.data);
    await audit(session.email, "landing.block.update", blockId, parsed.data.section);
  } else {
    const created = await createBlock(parsed.data);
    await audit(session.email, "landing.block.create", created.id, parsed.data.section);
  }

  revalidateLandingSurfaces();
  redirect(`/admin/konten?tab=landing&section=${parsed.data.section}&saved=1`);
}

export async function toggleBlockAction(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; reason?: string }> {
  await requireRole([...CONTENT_ROLES]);
  await setBlockActive(id, active);
  revalidateLandingSurfaces();
  return { ok: true };
}

export async function deleteBlockAction(
  id: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await requireRole([...CONTENT_ROLES]);
  await deleteBlock(id);
  await audit(session.email, "landing.block.delete", id);
  revalidateLandingSurfaces();
  return { ok: true };
}

export async function moveBlockAction(
  id: string,
  direction: "up" | "down",
): Promise<{ ok: boolean; reason?: string }> {
  await requireRole([...CONTENT_ROLES]);
  await moveBlock(id, direction);
  revalidateLandingSurfaces();
  return { ok: true };
}

/** Saves the landing hero + section headings. */
export async function saveLandingCopyAction(
  _prev: CopyFormState,
  form: FormData,
): Promise<CopyFormState> {
  const session = await requireRole([...CONTENT_ROLES]);

  const K = LANDING_SETTING_KEYS;
  const entries: Record<string, string> = {};

  // Persist every known key, trimming values; blanks are allowed (a section
  // heading can be intentionally empty).
  for (const [prop, key] of Object.entries(K)) {
    entries[key] = String(form.get(prop) ?? "").trim();
  }

  if (!entries[K.heroTitleLine1] && !entries[K.heroTitleLine2]) {
    return { ok: false, message: "Judul hero tidak boleh kosong keduanya." };
  }

  await saveSettings(entries);
  await audit(session.email, "landing.copy.save", "landing");
  revalidateLandingSurfaces();

  return { ok: true, message: "Konten landing tersimpan." };
}
