import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

/**
 * Policy pages.
 *
 * All four policies share one route with content as data. They're statically
 * generated, so they cost nothing to serve.
 */

type Policy = {
  title: string;
  summary: string;
  updated: string;
  sections: Array<{ heading: string; body: string[] }>;
};

const POLICIES: Record<string, Policy> = {
  privasi: {
    title: "Kebijakan Privasi",
    summary:
      "Bagaimana Otakademi mengumpulkan, memakai, dan melindungi data peserta.",
    updated: "Agustus 2026",
    sections: [
      {
        heading: "Data yang kami kumpulkan",
        body: [
          "Saat mendaftar event, kami meminta nama lengkap, email, dan nomor WhatsApp. Data ini diperlukan untuk mengirim konfirmasi, tiket, dan pengingat.",
          "Kami juga bisa meminta informasi tambahan yang bersifat opsional, seperti institusi, kota, status pekerjaan, dan tujuan belajar. Data ini dipakai untuk menyesuaikan materi dan memahami peserta kami secara agregat.",
          "Kami menerapkan prinsip data minimization: kami tidak meminta data yang tidak kami butuhkan untuk menjalankan event.",
        ],
      },
      {
        heading: "Bagaimana data dipakai",
        body: [
          "Mengirim konfirmasi pendaftaran, instruksi pembayaran, tiket, dan pengingat sebelum acara.",
          "Memproses dan merekonsiliasi pembayaran.",
          "Melakukan check-in dan mencatat kehadiran.",
          "Mengirim informasi kelas berikutnya, yang bisa kamu hentikan kapan saja.",
          "Menyusun laporan agregat untuk mengevaluasi program. Laporan ini tidak menampilkan identitas individu.",
        ],
      },
      {
        heading: "Siapa yang bisa mengakses",
        body: [
          "Akses ke data pribadi peserta dibatasi pada anggota tim yang memerlukannya untuk menjalankan tugas: tim event untuk operasional peserta, dan tim finance untuk urusan pembayaran.",
          "Kami tidak menjual data peserta kepada pihak ketiga. Data hanya dibagikan ke penyedia layanan yang kami pakai untuk menjalankan operasional, seperti layanan email dan pemroses pembayaran, sebatas yang diperlukan.",
        ],
      },
      {
        heading: "Penyimpanan dan keamanan",
        body: [
          "Data disimpan pada basis data yang aksesnya dibatasi. Password akun internal disimpan dalam bentuk hash, bukan teks biasa. Koneksi ke situs kami menggunakan HTTPS.",
          "Data pendaftaran disimpan selama diperlukan untuk keperluan operasional dan pencatatan. Setelahnya, data yang sudah tidak dibutuhkan akan dihapus atau dianonimkan.",
        ],
      },
      {
        heading: "Hak kamu",
        body: [
          "Kamu berhak meminta salinan data pribadi yang kami simpan tentang kamu, meminta koreksi bila ada yang tidak akurat, dan meminta penghapusan data yang sudah tidak diperlukan untuk kewajiban pencatatan kami.",
          "Untuk mengajukan permintaan tersebut, hubungi kami lewat halaman kontak dengan menyebutkan email yang kamu pakai saat mendaftar.",
        ],
      },
      {
        heading: "Peserta di bawah umur",
        body: [
          "Program kami saat ini dirancang untuk peserta dewasa. Bila di masa depan kami membuka program untuk peserta di bawah umur, kami akan menerapkan alur persetujuan orang tua atau wali secara khusus sebelum fitur tersebut diaktifkan.",
        ],
      },
    ],
  },

  ketentuan: {
    title: "Syarat & Ketentuan",
    summary: "Ketentuan penggunaan situs dan keikutsertaan dalam event Otakademi.",
    updated: "Agustus 2026",
    sections: [
      {
        heading: "Penerimaan ketentuan",
        body: [
          "Dengan mendaftar event Otakademi, kamu dianggap telah membaca dan menyetujui ketentuan pada halaman ini beserta Kebijakan Privasi kami.",
        ],
      },
      {
        heading: "Pendaftaran",
        body: [
          "Kamu bertanggung jawab atas kebenaran data yang kamu masukkan. Data yang salah, khususnya email dan nomor WhatsApp, bisa membuat kamu tidak menerima tiket atau informasi penting.",
          "Satu pendaftaran berlaku untuk satu peserta. Tiket bersifat pribadi dan tidak untuk diperjualbelikan.",
          "Kami berhak menolak atau membatalkan pendaftaran yang terindikasi penyalahgunaan, misalnya pendaftaran ganda dalam jumlah besar atau penggunaan kode promo yang tidak sesuai peruntukannya.",
        ],
      },
      {
        heading: "Kuota dan daftar tunggu",
        body: [
          "Setiap event memiliki kuota. Bila kuota penuh, pendaftar berikutnya masuk daftar tunggu sesuai urutan waktu pendaftaran.",
          "Kursi yang terbuka karena pembatalan atau pembayaran yang kedaluwarsa akan ditawarkan kepada urutan daftar tunggu paling awal.",
        ],
      },
      {
        heading: "Pembayaran",
        body: [
          "Untuk event berbayar, kursi ditahan selama 24 jam sejak pendaftaran. Bila pembayaran belum kami terima dalam periode tersebut, pendaftaran otomatis dibatalkan dan kursi dilepas.",
          "Tiket dan hak mengikuti event terbit setelah pembayaran terverifikasi.",
        ],
      },
      {
        heading: "Perubahan jadwal oleh Otakademi",
        body: [
          "Kami berusaha menjalankan event sesuai jadwal yang diumumkan. Bila terjadi perubahan jadwal, pergantian mentor, atau pembatalan, kami akan menghubungi seluruh peserta terdaftar melalui email atau WhatsApp.",
          "Dalam hal pembatalan oleh kami, peserta berhak atas pengembalian dana penuh atau pemindahan ke jadwal pengganti.",
        ],
      },
      {
        heading: "Materi dan hak kekayaan intelektual",
        body: [
          "Materi, template, dan rekaman yang dibagikan dalam event adalah milik Otakademi atau mentor yang bersangkutan, dan diberikan untuk penggunaan pribadi peserta.",
          "Menyebarluaskan, menjual, atau menggunakan ulang materi tersebut untuk kepentingan komersial tanpa izin tertulis tidak diperkenankan.",
        ],
      },
      {
        heading: "Perilaku peserta",
        body: [
          "Kami mengharapkan lingkungan belajar yang aman dan saling menghormati. Perilaku yang mengganggu jalannya sesi atau merugikan peserta lain dapat berujung pada pengeluaran dari sesi tanpa pengembalian dana. Detailnya ada di halaman Kode Etik.",
        ],
      },
    ],
  },

  refund: {
    title: "Refund & Pembatalan",
    summary: "Ketentuan pengembalian dana dan pemindahan jadwal.",
    updated: "Agustus 2026",
    sections: [
      {
        heading: "Pembatalan oleh peserta",
        body: [
          "Pembatalan yang diajukan minimal 3 hari kalender sebelum tanggal event berhak atas pengembalian dana penuh, atau pemindahan ke kelas berikutnya sesuai pilihan kamu.",
          "Pembatalan kurang dari 3 hari sebelum event tidak dapat direfund. Namun kami tetap menawarkan pemindahan satu kali ke jadwal kelas serupa berikutnya, selama kuotanya masih tersedia.",
          "Ketidakhadiran tanpa pemberitahuan tidak dapat direfund maupun dipindahkan.",
        ],
      },
      {
        heading: "Pembatalan oleh Otakademi",
        body: [
          "Bila kami membatalkan event, kamu berhak memilih pengembalian dana penuh atau dipindahkan ke jadwal pengganti tanpa biaya tambahan.",
          "Bila terjadi perubahan jadwal yang signifikan dan kamu tidak bisa mengikuti jadwal baru, ketentuan yang sama berlaku.",
        ],
      },
      {
        heading: "Proses pengembalian dana",
        body: [
          "Ajukan permintaan lewat WhatsApp atau email dengan menyertakan kode pendaftaran dan nomor rekening tujuan.",
          "Pengembalian dana diproses dalam 7-14 hari kerja setelah permintaan disetujui. Dana dikembalikan ke rekening atas nama peserta atau pihak yang melakukan pembayaran.",
          "Biaya administrasi dari pihak bank atau pemroses pembayaran, bila ada, menjadi tanggungan peserta.",
        ],
      },
      {
        heading: "Kode promo dan harga khusus",
        body: [
          "Pendaftaran yang menggunakan kode promo direfund sesuai nominal yang benar-benar dibayarkan, bukan harga normal.",
          "Kode promo yang sudah terpakai pada pendaftaran yang dibatalkan tidak otomatis dapat digunakan kembali.",
        ],
      },
    ],
  },

  "kode-etik": {
    title: "Kode Etik",
    summary: "Aturan berperilaku selama mengikuti event Otakademi.",
    updated: "Agustus 2026",
    sections: [
      {
        heading: "Prinsip dasar",
        body: [
          "Otakademi ingin menjadi ruang belajar yang aman dan nyaman bagi siapa pun, tanpa memandang latar belakang, gender, keyakinan, disabilitas, atau tingkat pengalaman.",
          "Kami mengharapkan setiap peserta, mentor, dan tim menjaga sikap saling menghormati baik di sesi online maupun offline.",
        ],
      },
      {
        heading: "Perilaku yang diharapkan",
        body: [
          "Menghargai pendapat dan pertanyaan peserta lain, termasuk yang terlihat dasar.",
          "Memberi ruang bicara secara bergantian dan tidak mendominasi diskusi.",
          "Menjaga kerahasiaan cerita atau kasus pekerjaan yang dibagikan peserta lain dalam sesi.",
          "Memberi umpan balik pada gagasan, bukan menyerang pribadi.",
        ],
      },
      {
        heading: "Perilaku yang tidak dapat diterima",
        body: [
          "Pelecehan dalam bentuk apa pun, termasuk komentar bernuansa seksual, rasial, atau merendahkan.",
          "Intimidasi, ancaman, atau serangan pribadi terhadap peserta, mentor, maupun tim.",
          "Membagikan data pribadi peserta lain tanpa izin, termasuk tangkapan layar sesi.",
          "Mengganggu jalannya sesi secara sengaja, termasuk spam pada kanal chat.",
          "Merekam sesi tanpa izin dari penyelenggara dan mentor.",
        ],
      },
      {
        heading: "Melaporkan pelanggaran",
        body: [
          "Bila kamu mengalami atau melihat pelanggaran, laporkan kepada tim kami lewat WhatsApp atau email pada halaman kontak. Laporan ditangani secara rahasia.",
          "Sertakan konteks kejadian sejelas mungkin agar kami bisa menindaklanjuti dengan tepat.",
        ],
      },
      {
        heading: "Konsekuensi",
        body: [
          "Bergantung pada tingkat pelanggaran, tindakan kami bisa berupa teguran, pengeluaran dari sesi tanpa pengembalian dana, hingga larangan mengikuti event Otakademi di masa mendatang.",
        ],
      },
    ],
  },
};

const NAV = [
  { slug: "privasi", label: "Kebijakan Privasi" },
  { slug: "ketentuan", label: "Syarat & Ketentuan" },
  { slug: "refund", label: "Refund & Pembatalan" },
  { slug: "kode-etik", label: "Kode Etik" },
];

export function generateStaticParams() {
  return Object.keys(POLICIES).map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const policy = POLICIES[topic];

  if (!policy) return { title: "Kebijakan" };

  return {
    title: policy.title,
    description: policy.summary,
    alternates: { canonical: `/kebijakan/${topic}` },
  };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const policy = POLICIES[topic];

  if (!policy) notFound();

  return (
    <section className="section">
      <div className="container-page grid gap-10 lg:grid-cols-[15rem_1fr]">
        {/* Policy nav */}
        <nav aria-label="Daftar kebijakan" className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-navy-400">
            Kebijakan
          </h2>
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = item.slug === topic;
              return (
                <li key={item.slug}>
                  <Link
                    href={`/kebijakan/${item.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-gold-50 text-gold-700"
                        : "text-navy-600 hover:bg-navy-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <article className="max-w-2xl">
          <h1 className="text-h1">{policy.title}</h1>
          <p className="mt-3 text-lead text-navy-500">{policy.summary}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-navy-400">
            <Icon name="clock" size={14} />
            Terakhir diperbarui: {policy.updated}
          </p>

          <div className="mt-9 space-y-8">
            {policy.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-h3">{section.heading}</h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((para, i) => (
                    <p key={i} className="text-[0.9375rem] leading-relaxed text-navy-600">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-[--radius-card] border border-navy-100 bg-surface p-5">
            <p className="text-sm text-navy-600">
              Ada pertanyaan soal kebijakan ini?{" "}
              <Link href="/kontak" className="font-bold text-gold-700 underline">
                Hubungi tim kami
              </Link>
              .
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
