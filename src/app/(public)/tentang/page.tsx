import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Icon, type IconName } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Tentang Otakademi",
  description:
    "Otakademi membantu generasi muda berpikir lebih jernih dan punya skill yang relevan lewat kelas dan event praktis.",
  alternates: { canonical: "/tentang" },
};

const VALUES: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "target",
    title: "Output di atas teori",
    body: "Setiap sesi harus meninggalkan sesuatu yang bisa dipakai. Kalau tidak, formatnya kami ubah.",
  },
  {
    icon: "brain",
    title: "Cara berpikir dulu",
    body: "Tool berganti terus. Cara berpikir yang jernih bertahan jauh lebih lama.",
  },
  {
    icon: "users",
    title: "Diajar praktisi",
    body: "Mentor kami mengerjakan bidangnya sehari-hari, bukan cuma membacakan materi.",
  },
  {
    icon: "sparkles",
    title: "Jujur soal batasan",
    body: "Kami tidak menjanjikan jalan pintas. Yang kami janjikan: sesi yang padat dan berguna.",
  },
];

export default function TentangPage() {
  return (
    <>
      <section className="border-b border-navy-100 bg-surface">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h1 className="text-h1">
              Kami percaya cara berpikir bisa <span className="text-gradient-brand">dilatih</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lead text-navy-500">
              Otakademi lahir dari satu pengamatan sederhana: banyak orang muda punya
              akses ke informasi tanpa batas, tapi tetap kesulitan mengubahnya jadi
              keputusan dan karya yang bagus.
            </p>
          </div>
          <div className="flex justify-center">
            <Image
              src="/brand/mark.png"
              alt="Maskot Otakademi"
              width={220}
              height={220}
              quality={75}
              sizes="220px"
              className="anim-float drop-shadow-xl"
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-h2">Manifesto Singkat</h2>
          </div>
          <div className="space-y-4 text-[0.97rem] leading-relaxed text-navy-600">
            <p>
              Masalahnya bukan kurang materi. Video, artikel, dan kursus tersedia
              berlimpah. Yang sering hilang adalah latihan yang terarah, umpan balik
              yang jujur, dan konteks yang nyata.
            </p>
            <p>
              Karena itu kelas kami sengaja pendek dan padat. Peserta datang membawa
              persoalan sendiri, mengerjakannya di sesi, dan pulang dengan sesuatu yang
              sudah jadi, bukan sekadar catatan.
            </p>
            <p>
              Kami juga menolak menjual ilusi. Tidak ada kelas dua jam yang mengubah
              hidup. Tapi ada kelas dua jam yang memperbaiki cara kamu mendekati satu
              masalah, dan itu efeknya menumpuk.
            </p>
          </div>
        </div>
      </section>

      <section className="section bg-surface">
        <div className="container-page">
          <h2 className="mb-8 text-h2">Nilai yang Kami Pegang</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {VALUES.map((v, i) => (
              <div key={v.title} className={`card reveal d-${i + 1} p-6`}>
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-coral-50 text-coral-600">
                  <Icon name={v.icon} size={21} />
                </span>
                <h3 className="mt-4 text-base font-extrabold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <div className="card flex flex-col items-center gap-4 p-10 text-center">
            <h2 className="text-h2">Mau ikut kelas pertama kamu?</h2>
            <p className="max-w-lg text-navy-500">
              Mulai dari sesi gratis kalau ingin mencoba dulu.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/event" className="btn btn-primary btn-lg">
                Lihat Kelas
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link href="/institusi" className="btn btn-outline btn-lg">
                Program Institusi
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
