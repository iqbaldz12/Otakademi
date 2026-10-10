import { db } from "@/server/db";
import { sendCertificate } from "@/server/services/certificate-send.service";

/**
 * Lightweight in-process certificate send queue.
 *
 * Bulk sending runs in the background (not awaited by the admin request) so the
 * browser never times out. Progress is tracked in memory per event; the admin
 * dashboard polls it for live feedback. One job per event at a time.
 *
 * Note: this is an MVP in-memory runner. On a multi-instance / serverless host
 * it should move to a real queue (BullMQ, a DB-backed job table, etc.) — the
 * public interface here (`startBulkSend` / `getJob`) is what callers depend on,
 * so swapping the implementation won't touch them.
 */

export type CertJob = {
  eventId: string;
  total: number;
  done: number;
  sent: number;
  skipped: number;
  failed: number;
  running: boolean;
  startedAt: number;
  finishedAt: number | null;
  lastError?: string;
};

const jobs = new Map<string, CertJob>();

export function getJob(eventId: string): CertJob | null {
  return jobs.get(eventId) ?? null;
}

/**
 * Starts (or reports) a bulk send for every *attended* registration of an event
 * that hasn't received a certificate yet. Returns immediately; progress is read
 * via {@link getJob}. If a job is already running for the event, returns it.
 */
export async function startBulkSend(
  eventId: string,
): Promise<{ started: boolean; job: CertJob; reason?: string }> {
  const existing = jobs.get(eventId);
  if (existing?.running) {
    return { started: false, job: existing, reason: "Pengiriman sedang berjalan." };
  }

  // Eligible = attended and not yet sent.
  const targets = await db.registration.findMany({
    where: {
      eventId,
      status: "ATTENDED",
      certificateSentAt: null,
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const job: CertJob = {
    eventId,
    total: targets.length,
    done: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    running: targets.length > 0,
    startedAt: Date.now(),
    finishedAt: targets.length > 0 ? null : Date.now(),
  };
  jobs.set(eventId, job);

  if (targets.length === 0) {
    return { started: false, job, reason: "Tidak ada peserta hadir yang perlu dikirimi." };
  }

  // Fire-and-forget: process sequentially so SMTP isn't hammered. Errors on one
  // participant never stop the rest.
  void (async () => {
    for (const t of targets) {
      try {
        const r = await sendCertificate(t.id);
        if (r.ok) {
          if (r.already) job.skipped += 1;
          else job.sent += 1;
        } else {
          job.failed += 1;
          job.lastError = r.reason;
        }
      } catch (err) {
        job.failed += 1;
        job.lastError = err instanceof Error ? err.message : String(err);
      } finally {
        job.done += 1;
      }
    }
    job.running = false;
    job.finishedAt = Date.now();
  })();

  return { started: true, job };
}
