import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { findArchiveAction } from "@/server/actions/recording.actions";
import { getArchiveAccess } from "@/server/services/recording.service";
import { formatIDR } from "@/lib/format";

export const metadata: Metadata = {
  title: "Arsip Video",
  description: "Tonton rekaman kelas yang sudah selesai dengan kode pendaftaran.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/arsip" },
};

export const dynamic = "force-dynamic";

/**
 * Turns a YouTube/Vimeo watch URL into an embeddable one. Anything else returns
 * null, and the page falls back to a "watch on the source" button so we never
 * put an untrusted URL into an <iframe> that isn't a known video host.
 */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default async function ArsipPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const { code, error } = await searchParams;

  const access = code ? await getArchiveAccess(code) : null;

  return (
    <section className="section">
      <div className="container-page max-w-2xl">
        <div className="card p-6 sm:p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
            <Icon name="monitor" size={24} />
          </span>

          <h1 className="mt-4 text-h2">Arsip Video Kelas</h1>
          <p className="mt-2 text-navy-500">
            Sudah bayar dan ikut kelas berbayar? Masukkan kode pendaftaran untuk
            menonton rekamannya.
          </p>

          {/* ---- Lookup form ---- */}
          <form action={findArchiveAction} className="mt-6 space-y-4">
            <div>
              <label htmlFor="code" className="label">
                Kode pendaftaran
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                autoFocus
                autoComplete="off"
                spellCheck={false}
                defaultValue={code ?? ""}
                placeholder="OTK-XXXX-XXXX"
                className="field font-mono text-lg uppercase"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full">
              Buka Arsip
              <Icon name="arrow-right" size={18} />
            </button>
          </form>

          {error === "empty" && (
            <p className="mt-4 text-sm font-semibold text-coral-600" role="alert">
              Masukkan kode pendaftaran terlebih dahulu.
            </p>
          )}

          {/* ---- Result ---- */}
          {access && (
            <div className="mt-6 border-t border-navy-100 pt-6">
              {access.state === "not_found" && (
                <div className="flex items-start gap-2.5 rounded-xl border border-coral-200 bg-coral-50 p-4 text-sm font-semibold text-coral-800">
                  <Icon name="alert" size={17} className="mt-px shrink-0" />
                  Kode pendaftaran tidak ditemukan. Periksa kembali kodenya.
                </div>
              )}

              {access.state === "not_published" && (
                <div className="flex items-start gap-2.5 rounded-xl border border-navy-200 bg-navy-50 p-4 text-sm text-navy-700">
                  <Icon name="clock" size={17} className="mt-px shrink-0 text-navy-500" />
                  <span>
                    Arsip video untuk <strong>{access.eventTitle}</strong> belum
                    tersedia. Rekaman akan tampil di sini setelah panitia
                    menerbitkannya.
                  </span>
                </div>
              )}

              {access.state === "unpaid" && (
                <div className="rounded-xl border border-gold-200 bg-gold-50 p-5">
                  <h2 className="flex items-center gap-2 text-h3">
                    <Icon name="wallet" size={20} className="text-gold-700" />
                    Selesaikan Pembayaran Dulu
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-navy-700">
                    Rekaman <strong>{access.eventTitle}</strong> hanya bisa ditonton
                    peserta yang sudah membayar{" "}
                    <strong className="tnum">{formatIDR(access.amount)}</strong>.
                    Setelah pembayaranmu dikonfirmasi, buka lagi halaman ini.
                  </p>
                  <Link
                    href={`/tiket/${access.code}`}
                    className="btn btn-outline btn-md mt-4"
                  >
                    <Icon name="ticket" size={16} />
                    Lihat Status & Cara Bayar
                  </Link>
                </div>
              )}

              {access.state === "ok" && (
                <div>
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
                    <Icon name="check-circle" size={16} />
                    Akses terbuka untuk {access.participantName}
                  </div>

                  <h2 className="mt-4 text-h3">{access.eventTitle}</h2>

                  {(() => {
                    const embed = toEmbedUrl(access.recordingUrl);
                    if (embed) {
                      return (
                        <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl border border-navy-100 bg-black">
                          <iframe
                            src={embed}
                            title={`Rekaman ${access.eventTitle}`}
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      );
                    }
                    return (
                      <a
                        href={access.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-md mt-4"
                      >
                        <Icon name="external" size={17} />
                        Tonton Rekaman
                      </a>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          <p className="mt-5 border-t border-navy-100 pt-4 text-xs text-navy-400">
            Kehilangan kode? Buka{" "}
            <Link href="/cek-tiket" className="font-semibold text-navy-600 underline">
              Cek Tiket
            </Link>{" "}
            atau hubungi tim kami.
          </p>
        </div>
      </div>
    </section>
  );
}
