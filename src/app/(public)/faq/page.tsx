import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Accordion } from "@/components/ui/Accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Pertanyaan umum soal pendaftaran, pembayaran, tiket, refund, dan pelaksanaan event Otakademi.",
  alternates: { canonical: "/faq" },
};

const GROUPS = [
  {
    title: "Pendaftaran",
    items: [
      {
        q: "Apakah harus membuat akun?",
        a: "Tidak. Pendaftaran bersifat guest-first: cukup isi nama, email, dan nomor WhatsApp. Tiket kamu bisa diakses lewat link unik yang dikirim ke email.",
      },
      {
        q: "Bagaimana kalau kuota sudah penuh?",
        a: "Kamu otomatis masuk daftar tunggu sesuai urutan pendaftaran. Kalau ada peserta yang membatalkan atau pembayarannya kedaluwarsa, kursi otomatis ditawarkan ke urutan paling awal.",
      },
      {
        q: "Bisa daftar untuk beberapa orang sekaligus?",
        a: "Untuk saat ini pendaftaran dilakukan per orang, karena setiap peserta butuh tiket dan data sendiri. Untuk grup besar, hubungi kami lewat halaman kontak.",
      },
      {
        q: "Saya salah isi data, bagaimana?",
        a: "Kirim pesan ke WhatsApp kami dengan menyertakan kode pendaftaran. Tim kami bisa memperbaiki data dari dashboard.",
      },
    ],
  },
  {
    title: "Pembayaran",
    items: [
      {
        q: "Metode pembayaran apa yang tersedia?",
        a: "Saat ini transfer bank dengan verifikasi manual oleh tim kami. Payment gateway otomatis sedang dalam proses integrasi.",
      },
      {
        q: "Berapa lama kursi saya ditahan?",
        a: "Kursi ditahan 24 jam sejak pendaftaran. Kalau pembayaran belum masuk sampai batas itu, kursi dilepas dan ditawarkan ke daftar tunggu.",
      },
      {
        q: "Kapan tiket saya terbit?",
        a: "Untuk event gratis, tiket terbit langsung setelah form terkirim. Untuk event berbayar, tiket QR terbit setelah pembayaran dikonfirmasi.",
      },
      {
        q: "Kode promo saya tidak berfungsi?",
        a: "Cek kembali penulisannya, dan pastikan masa berlakunya belum habis. Kode juga punya kuota pemakaian yang bisa saja sudah penuh.",
      },
    ],
  },
  {
    title: "Pelaksanaan Event",
    items: [
      {
        q: "Event online-nya pakai platform apa?",
        a: "Sebagian besar lewat Zoom, beberapa lewat Google Meet. Link dikirim ke email dan juga tersedia di halaman tiket kamu.",
      },
      {
        q: "Ada rekamannya?",
        a: "Sebagian kelas menyediakan rekaman untuk peserta terdaftar. Informasi ini dicantumkan di halaman detail masing-masing event.",
      },
      {
        q: "Bagaimana proses check-in?",
        a: "Tunjukkan QR di halaman tiket kamu untuk dipindai petugas. Kalau QR bermasalah, sebutkan kode pendaftaran dan tim kami bisa check-in secara manual.",
      },
      {
        q: "Dapat sertifikat?",
        a: "Peserta yang hadir menerima e-certificate kehadiran. Sertifikasi kompetensi formal belum termasuk dalam program saat ini.",
      },
    ],
  },
  {
    title: "Pembatalan & Refund",
    items: [
      {
        q: "Saya berhalangan hadir, uangnya kembali?",
        a: "Pembatalan minimal 3 hari sebelum acara bisa direfund penuh, atau dipindahkan ke kelas berikutnya. Kurang dari itu, kami tawarkan pemindahan jadwal saja.",
      },
      {
        q: "Kalau event dibatalkan pihak Otakademi?",
        a: "Kamu berhak refund penuh, atau memilih dipindahkan ke jadwal pengganti. Kami menghubungi semua peserta terdaftar secara langsung.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <section className="border-b border-navy-100 bg-surface">
        <div className="container-page py-12">
          <h1 className="text-h1">Pertanyaan Umum</h1>
          <p className="mt-3 max-w-2xl text-lead text-navy-500">
            Hal-hal yang paling sering ditanyakan peserta. Kalau masih ada yang
            mengganjal, tim kami siap membantu.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container-page max-w-4xl space-y-10">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="mb-4 text-h3">{group.title}</h2>
              <Accordion items={group.items} name={`faq-${group.title}`} />
            </div>
          ))}

          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <Icon name="whatsapp" size={30} className="text-emerald-600" />
            <h2 className="text-h3">Masih ada pertanyaan?</h2>
            <p className="max-w-md text-sm text-navy-500">
              Kirim pesan ke tim kami. Biasanya dibalas dalam beberapa jam pada hari
              kerja.
            </p>
            <Link href="/kontak" className="btn btn-primary btn-md mt-1">
              Hubungi Kami
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
