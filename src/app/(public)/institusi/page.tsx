import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Accordion } from "@/components/ui/Accordion";

export const metadata: Metadata = {
  title: "Untuk Institusi",
  description:
    "Program Otakademi untuk sekolah, kampus, dan perusahaan: pelatihan skill praktis dan cara berpikir untuk tim atau siswa.",
  alternates: { canonical: "/institusi" },
};

const PROGRAMS: Array<{
  icon: IconName;
  title: string;
  audience: string;
  body: string;
  points: string[];
}> = [
  {
    icon: "users",
    title: "Sekolah & Kampus",
    audience: "Siswa SMA/SMK, mahasiswa",
    body: "Sesi yang menyiapkan siswa menghadapi dunia kerja dan kuliah dengan cara berpikir yang lebih tertata.",
    points: [
      "Workshop berpikir kritis dan literasi AI",
      "Kelas persiapan karier dan portofolio",
      "Format in-house atau online",
    ],
  },
  {
    icon: "target",
    title: "Perusahaan & Tim",
    audience: "Tim internal, fresh hire",
    body: "Pelatihan singkat yang fokus pada keterampilan yang langsung dipakai di pekerjaan sehari-hari.",
    points: [
      "Adopsi AI untuk produktivitas tim",
      "Komunikasi dan presentasi internal",
      "Materi disesuaikan konteks perusahaan",
    ],
  },
  {
    icon: "sparkles",
    title: "Kolaborasi Event",
    audience: "Komunitas, organisasi",
    body: "Kami buka untuk kolaborasi acara bersama komunitas dan organisasi yang tujuannya sejalan.",
    points: [
      "Co-branded workshop",
      "Pembicara untuk acara kamu",
      "Skema bagi hasil atau sponsorship",
    ],
  },
];

const FAQS = [
  {
    q: "Berapa minimum peserta untuk program in-house?",
    a: "Untuk sesi in-house, kami biasanya mulai dari 15 peserta. Di bawah itu, biasanya lebih hemat kalau tim kamu ikut kelas publik kami.",
  },
  {
    q: "Bisa materinya disesuaikan?",
    a: "Bisa. Kami mulai dengan sesi diskusi singkat untuk memahami konteks dan masalah yang ingin diselesaikan, lalu menyesuaikan studi kasus dan latihannya.",
  },
  {
    q: "Apakah bisa dilakukan secara online?",
    a: "Ya. Kami menjalankan format online, offline, dan hybrid. Untuk online kami tetap menjaga porsi latihan supaya sesi tidak jadi ceramah satu arah.",
  },
  {
    q: "Bagaimana soal invoice dan administrasi?",
    a: "Kami bisa menyediakan penawaran resmi, invoice, dan dokumen pendukung sesuai kebutuhan pengadaan institusi kamu.",
  },
  {
    q: "Apakah peserta dapat sertifikat?",
    a: "Peserta yang hadir menerima e-certificate. Untuk kebutuhan akreditasi khusus, silakan diskusikan lebih dulu dengan tim kami.",
  },
];

export default function InstitusiPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-navy-100 bg-navy-900 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="anim-drift absolute -right-24 -top-24 size-96 rounded-full bg-gold-400/20 blur-3xl" />
          <div
            className="anim-drift absolute -bottom-24 -left-20 size-80 rounded-full bg-coral-500/20 blur-3xl"
            style={{ animationDelay: "-9s" }}
          />
        </div>

        <div className="container-page relative py-16">
          <span className="badge badge-gold">Program Institusi</span>
          <h1 className="mt-5 max-w-3xl text-h1 text-white">
            Bawa Otakademi ke sekolah, kampus, atau tim kamu.
          </h1>
          <p className="mt-5 max-w-2xl text-lead text-navy-200">
            Kami merancang sesi yang menyesuaikan konteks institusi kamu, dengan porsi
            latihan yang cukup supaya peserta benar-benar terlatih, bukan cuma
            mendengarkan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/kontak" className="btn btn-primary btn-lg">
              Diskusi Kebutuhan
              <Icon name="arrow-right" size={18} />
            </Link>
            <Link
              href="/event"
              className="btn btn-lg border-white/60 bg-white/10 text-white hover:bg-white/20"
            >
              Lihat Contoh Kelas
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <h2 className="mb-8 text-h2">Pilihan Program</h2>
          <div className="grid gap-5 lg:grid-cols-3">
            {PROGRAMS.map((p, i) => (
              <div key={p.title} className={`card card-interactive reveal d-${i + 1} flex flex-col p-6`}>
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
                  <Icon name={p.icon} size={21} />
                </span>
                <h3 className="mt-4 text-h3">{p.title}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-coral-600">
                  {p.audience}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-navy-500">{p.body}</p>
                <ul className="mt-4 space-y-2 border-t border-navy-100 pt-4">
                  {p.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-navy-600">
                      <Icon
                        name="check"
                        size={15}
                        className="mt-0.5 shrink-0 text-emerald-600"
                        strokeWidth={2.6}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-surface">
        <div className="container-page">
          <h2 className="mb-8 text-h2">Cara Kerjanya</h2>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Diskusi awal", d: "Kami dengar dulu konteks dan masalah yang ingin diselesaikan." },
              { n: "02", t: "Rancang program", d: "Materi, format, dan durasi disesuaikan dengan peserta." },
              { n: "03", t: "Jalankan sesi", d: "Online, offline, atau hybrid sesuai kebutuhan." },
              { n: "04", t: "Laporan hasil", d: "Rekap kehadiran, feedback peserta, dan rekomendasi lanjutan." },
            ].map((s, i) => (
              <li key={s.n} className={`card reveal d-${i + 1} p-6`}>
                <span className="text-2xl font-extrabold text-gold-700 tnum">{s.n}</span>
                <h3 className="mt-2 text-base font-extrabold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-h2">Pertanyaan Institusi</h2>
            <p className="mt-3 text-navy-500">
              Belum ketemu jawabannya? Kirim pesan, kami balas dengan penawaran yang
              sesuai.
            </p>
            <Link href="/kontak" className="btn btn-primary btn-md mt-5">
              Hubungi Tim
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <Accordion items={FAQS} name="institusi-faq" />
        </div>
      </section>
    </>
  );
}
