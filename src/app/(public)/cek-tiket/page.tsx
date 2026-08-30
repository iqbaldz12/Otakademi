import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/server/db";

export const metadata: Metadata = {
  title: "Cek Tiket",
  description: "Masukkan kode pendaftaran untuk melihat status dan tiket kamu.",
  alternates: { canonical: "/cek-tiket" },
};

/**
 * Ticket lookup.
 *
 * Implemented as a server action on a plain form, so it works without any client
 * JavaScript. An unknown code re-renders with a message rather than redirecting,
 * which also avoids confirming whether a given code exists beyond what the user
 * already typed.
 */
async function findTicket(formData: FormData) {
  "use server";

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();

  if (!code) redirect("/cek-tiket?error=empty");

  const reg = await db.registration.findUnique({
    where: { code },
    select: { code: true },
  });

  if (!reg) redirect("/cek-tiket?error=notfound");

  redirect(`/tiket/${reg.code}`);
}

export default async function CekTiketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <section className="section">
      <div className="container-page max-w-lg">
        <div className="card p-6 sm:p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
            <Icon name="ticket" size={24} />
          </span>

          <h1 className="mt-4 text-h2">Cek Tiket Saya</h1>
          <p className="mt-2 text-navy-500">
            Masukkan kode pendaftaran yang kamu terima setelah mendaftar.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-coral-200 bg-coral-50 p-4 text-sm font-semibold text-coral-800"
            >
              <Icon name="alert" size={17} className="mt-px shrink-0" />
              {error === "notfound"
                ? "Kode pendaftaran tidak ditemukan. Periksa kembali, atau hubungi tim kami."
                : "Masukkan kode pendaftaran terlebih dahulu."}
            </div>
          )}

          <form action={findTicket} className="mt-6 space-y-4">
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
                placeholder="OTK-XXXX-XXXX"
                className="field font-mono text-lg uppercase"
              />
              <p className="hint">
                Formatnya seperti OTK-7QF2-M9K4, tercantum di email konfirmasi.
              </p>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full">
              Cari Tiket
              <Icon name="arrow-right" size={18} />
            </button>
          </form>

          <p className="mt-5 border-t border-navy-100 pt-4 text-xs text-navy-400">
            Kehilangan kode? Hubungi kami lewat WhatsApp dengan menyebutkan email yang
            kamu pakai saat mendaftar.
          </p>
        </div>
      </div>
    </section>
  );
}
