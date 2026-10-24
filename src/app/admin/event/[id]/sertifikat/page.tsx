import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { CertificateTemplateForm } from "@/components/admin/CertificateTemplateForm";
import { CertificateManager } from "@/components/admin/CertificateManager";
import { getEventById } from "@/server/services/event.service";
import {
  listCertificateRoster,
  certificateSummary,
} from "@/server/services/certificate-send.service";
import { getJob } from "@/server/services/certificate-queue.service";
import { StaffCertificateSection } from "@/components/admin/StaffCertificateSection";
import { listEventStaff } from "@/server/services/staff-certificate.service";
import { fmtDateLong } from "@/lib/format";

export const metadata: Metadata = { title: "Sertifikat Event" };
export const dynamic = "force-dynamic";

export default async function EventCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await getEventById(id);
  if (!event) notFound();

  const [roster, summary, staff] = await Promise.all([
    listCertificateRoster(id),
    certificateSummary(id),
    listEventStaff(id),
  ]);
  const job = getJob(id);

  const moderators = staff
    .filter((s) => s.role === "MODERATOR")
    .map((s) => ({ id: s.id, name: s.name, email: s.email, certificateNumber: s.certificateNumber, sentAt: s.sentAt ? s.sentAt.toISOString() : null }));
  const speakers = staff
    .filter((s) => s.role === "SPEAKER")
    .map((s) => ({ id: s.id, name: s.name, email: s.email, certificateNumber: s.certificateNumber, sentAt: s.sentAt ? s.sentAt.toISOString() : null }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/event" className="btn btn-ghost btn-sm -ml-3 mb-3">
          <Icon name="arrow-left" size={16} />
          Kembali ke daftar event
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-h2">Sertifikat</h1>
            <p className="mt-1 text-sm text-navy-500">
              {event.title} &middot; {fmtDateLong(event.startAt)}
            </p>
          </div>
          <Link href={`/admin/event/${event.id}/absen`} className="btn btn-outline btn-sm">
            <Icon name="check-circle" size={15} />
            Absensi
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="card flex flex-wrap items-center gap-6 p-5">
        <div>
          <p className="text-xs font-semibold text-navy-400">Hadir</p>
          <p className="mt-0.5 text-2xl font-extrabold text-navy-900 tnum">{summary.attended}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-navy-400">Sertifikat terkirim</p>
          <p className="mt-0.5 text-2xl font-extrabold text-emerald-600 tnum">{summary.sent}</p>
        </div>
        {!event.certificateTemplate && (
          <p className="ml-auto flex items-center gap-2 rounded-lg bg-gold-50 px-3 py-2 text-xs font-semibold text-gold-700">
            <Icon name="alert" size={14} />
            Template belum di-upload
          </p>
        )}
      </div>

      <CertificateTemplateForm
        eventId={event.id}
        initial={{
          template: event.certificateTemplate,
          nameX: event.certNameX,
          nameY: event.certNameY,
          nameSize: event.certNameSize,
          nameColor: event.certNameColor,
          dateShow: event.certDateShow,
          dateX: event.certDateX,
          dateY: event.certDateY,
          dateSize: event.certDateSize,
          numberShow: event.certNumberShow,
          numberX: event.certNumberX,
          numberY: event.certNumberY,
          numberSize: event.certNumberSize,
          qrShow: event.certQrShow,
          qrX: event.certQrX,
          qrY: event.certQrY,
          qrSize: event.certQrSize,
        }}
      />

      <CertificateManager
        eventId={event.id}
        rows={roster}
        hasTemplate={Boolean(event.certificateTemplate)}
        initialJob={job}
      />

      <StaffCertificateSection
        eventId={event.id}
        role="MODERATOR"
        roleLabel="Moderator"
        prefix="mod"
        initialTemplate={{
          template: event.modTemplate,
          nameX: event.modNameX,
          nameY: event.modNameY,
          nameSize: event.modNameSize,
          nameColor: event.modNameColor,
          numberShow: event.modNumberShow,
          numberX: event.modNumberX,
          numberY: event.modNumberY,
          numberSize: event.modNumberSize,
          qrShow: event.modQrShow,
          qrX: event.modQrX,
          qrY: event.modQrY,
          qrSize: event.modQrSize,
        }}
        staff={moderators}
      />

      <StaffCertificateSection
        eventId={event.id}
        role="SPEAKER"
        roleLabel="Narasumber"
        prefix="spk"
        initialTemplate={{
          template: event.spkTemplate,
          nameX: event.spkNameX,
          nameY: event.spkNameY,
          nameSize: event.spkNameSize,
          nameColor: event.spkNameColor,
          numberShow: event.spkNumberShow,
          numberX: event.spkNumberX,
          numberY: event.spkNumberY,
          numberSize: event.spkNumberSize,
          qrShow: event.spkQrShow,
          qrX: event.spkQrX,
          qrY: event.spkQrY,
          qrSize: event.spkQrSize,
        }}
        staff={speakers}
      />
    </div>
  );
}
