"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/toast";
import {
  sendCertificateAction,
  bulkSendCertificatesAction,
  getCertificateJobAction,
} from "@/server/actions/certificate.actions";
import type { CertRosterRow } from "@/server/services/certificate-send.service";
import type { CertJob } from "@/server/services/certificate-queue.service";

/**
 * Certificate roster + actions (client).
 *
 * Per-row "Kirim" is disabled unless the participant has attended, with a
 * tooltip explaining why. Bulk send starts a background job and this component
 * polls its progress so the admin gets live feedback without the page hanging.
 */
export function CertificateManager({
  eventId,
  rows,
  hasTemplate,
  initialJob,
}: {
  eventId: string;
  rows: CertRosterRow[];
  hasTemplate: boolean;
  initialJob: CertJob | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [job, setJob] = useState<CertJob | null>(initialJob);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll bulk-send progress while a job is running.
  useEffect(() => {
    if (!job?.running) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const next = await getCertificateJobAction(eventId);
      setJob(next);
      if (next && !next.running) {
        if (pollRef.current) clearInterval(pollRef.current);
        toast(
          `Selesai: ${next.sent} terkirim, ${next.skipped} dilewati, ${next.failed} gagal.`,
          next.failed > 0 ? "error" : "success",
        );
      }
    }, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [job?.running, eventId]);

  function sendOne(registrationId: string, force: boolean) {
    startTransition(async () => {
      const r = await sendCertificateAction(eventId, registrationId, force);
      toast(r.reason ?? (r.ok ? "Terkirim." : "Gagal."), r.ok ? "success" : "error");
    });
  }

  function bulkSend() {
    startTransition(async () => {
      const r = await bulkSendCertificatesAction(eventId);
      toast(r.reason ?? "Diproses.", r.ok ? "success" : "error");
      if (r.ok) {
        const next = await getCertificateJobAction(eventId);
        setJob(next);
      }
    });
  }

  const attendedUnsent = rows.filter((r) => r.attended && !r.sentAt).length;

  return (
    <div className="space-y-4">
      {/* Bulk control */}
      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-h3">Kirim Massal</h2>
          <p className="mt-0.5 text-sm text-navy-500">
            {hasTemplate
              ? `${attendedUnsent} peserta hadir belum dikirimi sertifikat.`
              : "Upload template dulu sebelum mengirim sertifikat."}
          </p>
          {job && (
            <div className="mt-2 text-xs font-semibold text-navy-600">
              {job.running ? (
                <span className="flex items-center gap-2">
                  <span className="anim-spin size-3.5 rounded-full border-2 border-navy-300 border-t-transparent" />
                  Memproses {job.done}/{job.total}... ({job.sent} terkirim, {job.failed} gagal)
                </span>
              ) : (
                <span>
                  Terakhir: {job.sent} terkirim, {job.skipped} dilewati, {job.failed} gagal.
                </span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={bulkSend}
          disabled={isPending || !hasTemplate || job?.running || attendedUnsent === 0}
          className="btn btn-primary btn-md shrink-0"
        >
          <Icon name="mail" size={16} />
          Kirim ke Semua yang Hadir
        </button>
      </div>

      {/* Roster */}
      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <Icon name="users" size={32} className="text-navy-200" />
          <h2 className="text-h3">Belum ada peserta</h2>
          <p className="max-w-sm text-sm text-navy-500">
            Sertifikat hanya untuk peserta terkonfirmasi yang sudah hadir.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-navy-100 bg-surface text-left">
                  <th className="px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">Peserta</th>
                  <th className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">Kehadiran</th>
                  <th className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">Sertifikat</th>
                  <th className="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {rows.map((r) => (
                  <tr key={r.registrationId} className="hover:bg-surface">
                    <td className="px-5 py-3">
                      <p className="font-bold text-navy-900">{r.name}</p>
                      <p className="text-xs text-navy-400">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.attended ? (
                        <Badge tone="green" dot>Sudah Absen</Badge>
                      ) : (
                        <Badge tone="grey">Belum Absen</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.sentAt ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <Icon name="check-circle" size={14} />
                            Terkirim
                          </span>
                          {r.certificateNumber && (
                            <span className="font-mono text-[0.65rem] text-navy-400">
                              {r.certificateNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-navy-300">Belum dikirim</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!r.attended ? (
                        <span
                          title="Peserta belum melakukan absensi"
                          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-bold text-navy-300"
                        >
                          <Icon name="mail" size={14} />
                          Kirim
                        </span>
                      ) : r.sentAt ? (
                        <button
                          type="button"
                          onClick={() => sendOne(r.registrationId, true)}
                          disabled={isPending || !hasTemplate}
                          className="btn btn-ghost btn-sm"
                        >
                          <Icon name="mail" size={14} />
                          Kirim Ulang
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => sendOne(r.registrationId, false)}
                          disabled={isPending || !hasTemplate}
                          className="btn btn-outline btn-sm"
                          title={hasTemplate ? "" : "Upload template dulu"}
                        >
                          <Icon name="mail" size={14} />
                          Generate & Kirim
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
