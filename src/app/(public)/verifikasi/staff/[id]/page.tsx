import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/site/Logo";
import { verifyStaffCertificate } from "@/server/services/staff-certificate.service";
import { fmtDateLong, fmtDateTimeShort } from "@/lib/format";

export const metadata: Metadata = {
  title: "Verifikasi Sertifikat",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Public verification for moderator/speaker certificates (QR target).
 * Mirrors the participant verification page.
 */
export default async function VerifikasiStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await verifyStaffCertificate(id);

  return (
    <section className="section bg-surface">
      <div className="container-page max-w-lg">
        <div className="card overflow-hidden">
          <div
            className={`h-2 w-full ${result.valid ? "bg-emerald-500" : "bg-coral-500"}`}
            aria-hidden="true"
          />
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <Logo height={30} href={null} />
              <span className={`badge ${result.valid ? "badge-green" : "badge-coral"}`}>
                <Icon name={result.valid ? "check-circle" : "x-circle"} size={14} />
                {result.valid ? "Terverifikasi" : "Tidak Valid"}
              </span>
            </div>

            {result.valid ? (
              <>
                <h1 className="mt-6 text-h2">Sertifikat Asli</h1>
                <p className="mt-1 text-sm leading-relaxed text-navy-600">
                  Sertifikat ini resmi diterbitkan oleh Otakademi sebagai apresiasi
                  kepada <strong className="text-navy-900">{result.roleLabel}</strong>{" "}
                  pada acara berikut.
                </p>
                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <dt className="w-28 shrink-0 text-xs font-bold uppercase text-navy-400">Nama</dt>
                    <dd className="font-bold text-navy-900">{result.name}</dd>
                  </div>
                  <div className="flex items-start gap-3">
                    <dt className="w-28 shrink-0 text-xs font-bold uppercase text-navy-400">Peran</dt>
                    <dd className="font-semibold text-navy-800">{result.roleLabel}</dd>
                  </div>
                  <div className="flex items-start gap-3">
                    <dt className="w-28 shrink-0 text-xs font-bold uppercase text-navy-400">Kegiatan</dt>
                    <dd className="font-semibold text-navy-800">{result.eventTitle}</dd>
                  </div>
                  <div className="flex items-start gap-3">
                    <dt className="w-28 shrink-0 text-xs font-bold uppercase text-navy-400">Tanggal</dt>
                    <dd className="font-semibold text-navy-800">{fmtDateLong(result.eventDate)}</dd>
                  </div>
                  <div className="flex items-start gap-3">
                    <dt className="w-28 shrink-0 text-xs font-bold uppercase text-navy-400">No. Sertifikat</dt>
                    <dd className="font-mono font-bold text-navy-900">{result.number}</dd>
                  </div>
                  {result.issuedAt && (
                    <div className="flex items-start gap-3">
                      <dt className="w-28 shrink-0 text-xs font-bold uppercase text-navy-400">Diterbitkan</dt>
                      <dd className="text-navy-600">{fmtDateTimeShort(result.issuedAt)}</dd>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <>
                <h1 className="mt-6 text-h2">Sertifikat Tidak Ditemukan</h1>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">
                  Kode sertifikat ini tidak dikenali atau belum diterbitkan.
                </p>
              </>
            )}

            <div className="mt-8 border-t border-navy-100 pt-5">
              <Link href="/" className="btn btn-outline btn-md">
                <Icon name="arrow-left" size={16} />
                Ke Beranda Otakademi
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
