"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit } from "@/server/auth";
import { db } from "@/server/db";
import {
  saveCertificateTemplate,
  deleteUpload,
} from "@/server/services/upload.service";
import { sendCertificate } from "@/server/services/certificate-send.service";
import { startBulkSend, getJob, type CertJob } from "@/server/services/certificate-queue.service";

export type CertActionResult = { ok: boolean; reason?: string };

function num(form: FormData, key: string, fallback: number): number {
  const v = Number(form.get(key));
  return Number.isFinite(v) ? v : fallback;
}
function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * Uploads a blank certificate template for an event and saves the text-overlay
 * layout. One template per event; replacing it deletes the old file.
 */
export async function saveCertificateTemplateAction(
  eventId: string,
  form: FormData,
): Promise<CertActionResult> {
  const session = await requireAdmin();

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { certificateTemplate: true },
  });
  if (!event) return { ok: false, reason: "Event tidak ditemukan." };

  let templatePath = event.certificateTemplate;

  const file = form.get("template");
  if (file instanceof File && file.size > 0) {
    const saved = await saveCertificateTemplate(file);
    if (!saved.ok) return { ok: false, reason: saved.reason };
    // Remove the previous template file once the new one is stored.
    if (event.certificateTemplate && event.certificateTemplate !== saved.path) {
      await deleteUpload(event.certificateTemplate);
    }
    templatePath = saved.path;
  }

  await db.event.update({
    where: { id: eventId },
    data: {
      certificateTemplate: templatePath,
      certNameX: clamp01(num(form, "certNameX", 0.5)),
      certNameY: clamp01(num(form, "certNameY", 0.5)),
      certNameSize: clamp01(num(form, "certNameSize", 0.06)),
      certNameColor: (form.get("certNameColor") as string)?.trim() || "#1A2C4E",
      certDateShow: form.get("certDateShow") === "on" || form.get("certDateShow") === "true",
      certDateX: clamp01(num(form, "certDateX", 0.5)),
      certDateY: clamp01(num(form, "certDateY", 0.62)),
      certDateSize: clamp01(num(form, "certDateSize", 0.028)),
      certNumberShow:
        form.get("certNumberShow") === "on" || form.get("certNumberShow") === "true",
      certNumberX: clamp01(num(form, "certNumberX", 0.5)),
      certNumberY: clamp01(num(form, "certNumberY", 0.9)),
      certNumberSize: clamp01(num(form, "certNumberSize", 0.02)),
      certQrShow: form.get("certQrShow") === "on" || form.get("certQrShow") === "true",
      certQrX: clamp01(num(form, "certQrX", 0.9)),
      certQrY: clamp01(num(form, "certQrY", 0.86)),
      certQrSize: clamp01(num(form, "certQrSize", 0.12)),
    },
  });

  await audit(session.email, "certificate.template", eventId);
  revalidatePath(`/admin/event/${eventId}/sertifikat`);
  revalidatePath(`/admin/event/${eventId}`);
  return { ok: true, reason: "Template & tata letak sertifikat disimpan." };
}

/** Removes the uploaded template for an event. */
export async function removeCertificateTemplateAction(
  eventId: string,
): Promise<CertActionResult> {
  const session = await requireAdmin();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { certificateTemplate: true },
  });
  if (event?.certificateTemplate) {
    await deleteUpload(event.certificateTemplate);
  }
  await db.event.update({
    where: { id: eventId },
    data: { certificateTemplate: null },
  });
  await audit(session.email, "certificate.template.remove", eventId);
  revalidatePath(`/admin/event/${eventId}/sertifikat`);
  return { ok: true, reason: "Template dihapus." };
}

/**
 * Generates and sends a certificate to one participant.
 *
 * The attended-only rule is enforced in the service too, so this is safe even
 * if the UI button guard is bypassed.
 */
export async function sendCertificateAction(
  eventId: string,
  registrationId: string,
  force = false,
): Promise<CertActionResult> {
  const session = await requireAdmin();

  const result = await sendCertificate(registrationId, { force });
  if (!result.ok) return { ok: false, reason: result.reason };

  await audit(session.email, "certificate.send", registrationId, result.number);
  revalidatePath(`/admin/event/${eventId}/sertifikat`);

  return {
    ok: true,
    reason: result.already
      ? "Sertifikat sudah pernah dikirim sebelumnya."
      : `Sertifikat ${result.name} terkirim.`,
  };
}

/** Kicks off a background bulk send for all attended-but-unsent participants. */
export async function bulkSendCertificatesAction(
  eventId: string,
): Promise<CertActionResult> {
  const session = await requireAdmin();

  const { started, job, reason } = await startBulkSend(eventId);
  await audit(session.email, "certificate.bulkSend", eventId, `${job.total} target`);
  revalidatePath(`/admin/event/${eventId}/sertifikat`);

  if (!started) return { ok: false, reason: reason ?? "Tidak ada yang dikirim." };
  return { ok: true, reason: `Pengiriman ${job.total} sertifikat dimulai di latar belakang.` };
}

/** Polled by the dashboard for live bulk-send progress. */
export async function getCertificateJobAction(
  eventId: string,
): Promise<CertJob | null> {
  await requireAdmin();
  return getJob(eventId);
}
