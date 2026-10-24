"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit } from "@/server/auth";
import { db } from "@/server/db";
import {
  saveCertificateTemplate,
  deleteUpload,
} from "@/server/services/upload.service";
import {
  buildStaffCertificate,
  sendStaffCertificate,
} from "@/server/services/staff-certificate.service";
import type { EventStaffRole } from "@prisma/client";

export type StaffActionResult = { ok: boolean; reason?: string };

function num(form: FormData, key: string, fallback: number): number {
  const v = Number(form.get(key));
  return Number.isFinite(v) ? v : fallback;
}
function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Saves the template + name/QR layout for one staff role (moderator/speaker).
 * Field names are prefixed `mod`/`spk` to match the Event columns.
 */
export async function saveStaffTemplateAction(
  eventId: string,
  role: EventStaffRole,
  form: FormData,
): Promise<StaffActionResult> {
  const session = await requireAdmin();
  const p = role === "MODERATOR" ? "mod" : "spk";

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { modTemplate: true, spkTemplate: true },
  });
  if (!event) return { ok: false, reason: "Event tidak ditemukan." };

  const currentTemplate = role === "MODERATOR" ? event.modTemplate : event.spkTemplate;
  let templatePath = currentTemplate;

  const file = form.get("template");
  if (file instanceof File && file.size > 0) {
    const saved = await saveCertificateTemplate(file);
    if (!saved.ok) return { ok: false, reason: saved.reason };
    if (currentTemplate && currentTemplate !== saved.path) {
      await deleteUpload(currentTemplate);
    }
    templatePath = saved.path;
  }

  await db.event.update({
    where: { id: eventId },
    data: {
      [`${p}Template`]: templatePath,
      [`${p}NameX`]: clamp01(num(form, `${p}NameX`, 0.5)),
      [`${p}NameY`]: clamp01(num(form, `${p}NameY`, 0.5)),
      [`${p}NameSize`]: clamp01(num(form, `${p}NameSize`, 0.06)),
      [`${p}NameColor`]: str(form, `${p}NameColor`) || "#1A2C4E",
      [`${p}NumberShow`]: form.get(`${p}NumberShow`) === "on" || form.get(`${p}NumberShow`) === "true",
      [`${p}NumberX`]: clamp01(num(form, `${p}NumberX`, 0.5)),
      [`${p}NumberY`]: clamp01(num(form, `${p}NumberY`, 0.9)),
      [`${p}NumberSize`]: clamp01(num(form, `${p}NumberSize`, 0.02)),
      [`${p}QrShow`]: form.get(`${p}QrShow`) === "on" || form.get(`${p}QrShow`) === "true",
      [`${p}QrX`]: clamp01(num(form, `${p}QrX`, 0.9)),
      [`${p}QrY`]: clamp01(num(form, `${p}QrY`, 0.86)),
      [`${p}QrSize`]: clamp01(num(form, `${p}QrSize`, 0.12)),
    },
  });

  await audit(session.email, "certificate.staffTemplate", eventId, role);
  revalidatePath(`/admin/event/${eventId}/sertifikat`);
  return { ok: true, reason: "Template & tata letak disimpan." };
}

/** Adds one moderator/speaker (name typed by admin, email optional). */
export async function addStaffAction(
  eventId: string,
  role: EventStaffRole,
  name: string,
  email: string,
): Promise<StaffActionResult> {
  const session = await requireAdmin();
  const n = name.trim();
  if (n.length < 2) return { ok: false, reason: "Nama minimal 2 karakter." };

  const last = await db.eventStaff.findFirst({
    where: { eventId, role },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await db.eventStaff.create({
    data: {
      eventId,
      role,
      name: n,
      email: email.trim() || null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  await audit(session.email, "certificate.staffAdd", eventId, `${role}: ${n}`);
  revalidatePath(`/admin/event/${eventId}/sertifikat`);
  return { ok: true, reason: "Ditambahkan." };
}

/** Removes a staff entry. */
export async function removeStaffAction(
  eventId: string,
  staffId: string,
): Promise<StaffActionResult> {
  const session = await requireAdmin();
  await db.eventStaff.delete({ where: { id: staffId } });
  await audit(session.email, "certificate.staffRemove", staffId);
  revalidatePath(`/admin/event/${eventId}/sertifikat`);
  return { ok: true, reason: "Dihapus." };
}

/**
 * Generates a staff certificate and returns the PDF as a base64 string so the
 * browser can download it directly.
 */
export async function generateStaffCertificateAction(
  staffId: string,
): Promise<
  { ok: true; filename: string; dataBase64: string } | { ok: false; reason: string }
> {
  await requireAdmin();
  const built = await buildStaffCertificate(staffId);
  if (!built.ok) return { ok: false, reason: built.reason };
  return {
    ok: true,
    filename: built.filename,
    dataBase64: built.pdf.toString("base64"),
  };
}

/** Emails a staff certificate (needs an email on the record). */
export async function sendStaffCertificateAction(
  eventId: string,
  staffId: string,
): Promise<StaffActionResult> {
  const session = await requireAdmin();
  const r = await sendStaffCertificate(staffId);
  if (!r.ok) return r;
  await audit(session.email, "certificate.staffSend", staffId);
  revalidatePath(`/admin/event/${eventId}/sertifikat`);
  return { ok: true, reason: "Sertifikat terkirim." };
}
