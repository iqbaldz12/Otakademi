/**
 * Database seed.
 *
 * Written in plain ESM rather than TypeScript so it runs on bare `node` with no
 * extra transpiler dependency. Idempotent: safe to run repeatedly.
 *
 *   npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCb } from "node:crypto";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers (mirrors src/server/auth.ts and src/lib/ids.ts)
// ---------------------------------------------------------------------------

function scrypt(password, salt, keylen, options) {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, { N: 16384 });
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

const HUMAN = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function pick(alphabet, n) {
  const bytes = randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const registrationCode = () => `OTK-${pick(HUMAN, 4)}-${pick(HUMAN, 4)}`;
const ticketToken = () => randomBytes(16).toString("hex");

/** Jakarta is UTC+7, so a local wall-clock time is that minus 7 hours in UTC. */
function jakarta(y, m, d, hour, minute = 0) {
  return new Date(Date.UTC(y, m - 1, d, hour - 7, minute));
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

/** Dates are anchored relative to today so the demo never looks stale. */
const today = new Date();
const Y = today.getFullYear();
const M = today.getMonth() + 1;

function inDays(days, hour, durationHours = 2) {
  const start = new Date(today);
  start.setDate(start.getDate() + days);
  const s = jakarta(start.getFullYear(), start.getMonth() + 1, start.getDate(), hour);
  const e = new Date(s.getTime() + durationHours * 3600 * 1000);
  return { startAt: s, endAt: e };
}

const EVENTS = [
  {
    title: "AI Bukan Cuma Prompt",
    slug: "ai-bukan-cuma-prompt",
    category: "AI & Teknologi",
    format: "ONLINE",
    venue: "Zoom",
    meetingLink: "https://zoom.us/j/otakademi-ai",
    ...inDays(15, 19.5 | 0),
    capacity: 100,
    price: 79000,
    status: "PUBLISHED",
    mentorName: "Raka Wibowo",
    mentorTitle: "AI Engineer, praktisi automation",
    bannerColor: "#F96469",
    summary:
      "Belajar memakai AI untuk menyelesaikan pekerjaan, bukan sekadar membuat prompt yang terdengar keren.",
    description: `Banyak orang sudah pakai AI tiap hari, tapi hasilnya berhenti di jawaban yang terdengar pintar dan tidak benar-benar menyelesaikan pekerjaan.

Kelas ini membedah cara memilih tool yang tepat untuk jenis pekerjaan tertentu, menyusun workflow yang bisa diulang, dan mengenali kapan AI justru memperlambat kamu.

Peserta membawa satu kasus pekerjaan atau kuliah yang nyata, lalu menyelesaikannya bersama di sesi ini dengan workflow yang tepat.`,
    outcomes: [
      "Framework memilih tool AI sesuai jenis pekerjaan",
      "Latihan workflow nyata dari kasus peserta",
      "Template prompt yang bisa dipakai ulang",
      "Cara mengecek dan mengoreksi output AI",
    ],
  },
  {
    title: "Cara Mikir Anti Asal",
    slug: "cara-mikir-anti-asal",
    category: "Cara Berpikir",
    format: "ONLINE",
    venue: "Zoom",
    meetingLink: "https://zoom.us/j/otakademi-mikir",
    ...inDays(22, 19),
    capacity: 80,
    price: 49000,
    status: "PUBLISHED",
    mentorName: "Dinda Ayu",
    mentorTitle: "Strategist, fasilitator berpikir kritis",
    bannerColor: "#FCA90A",
    summary:
      "Melatih cara mengambil keputusan yang jernih, tanpa terjebak asumsi dan bias yang tidak disadari.",
    description: `Sebagian besar keputusan buruk bukan karena kurang informasi, tapi karena cara memprosesnya keliru sejak awal.

Sesi ini membahas pola pikir yang sering menyesatkan: menyamakan urutan dengan sebab, mencari data yang cuma membenarkan keinginan, dan menyederhanakan masalah yang sebenarnya bercabang.

Kamu akan berlatih memakai beberapa alat berpikir sederhana pada kasus nyata milikmu sendiri.`,
    outcomes: [
      "Kenali 6 bias yang paling sering merusak keputusan",
      "Alat bantu memisahkan fakta, asumsi, dan opini",
      "Latihan membedah satu keputusan nyata milikmu",
    ],
  },
  {
    title: "Career Starter Lab",
    slug: "career-starter-lab",
    category: "Karier",
    format: "OFFLINE",
    venue: "Bandung Creative Hub",
    ...inDays(29, 9, 6),
    capacity: 40,
    price: 129000,
    status: "PUBLISHED",
    mentorName: "Sarah Meliana",
    mentorTitle: "Talent Acquisition Lead",
    bannerColor: "#5BC8E8",
    summary:
      "Satu hari intensif menyiapkan CV, portofolio, dan cara menjawab interview yang tidak template.",
    description: `Workshop tatap muka sehari penuh untuk kamu yang sedang mencari kerja pertama atau ingin pindah jalur.

Kita mulai dari membaca ulang CV kamu seperti seorang rekruter membacanya, lalu memperbaikinya di tempat. Setelah itu latihan interview dengan feedback langsung.

Bawa laptop dan CV versi terbaru kamu.`,
    outcomes: [
      "CV yang sudah direview langsung oleh rekruter",
      "Struktur portofolio sesuai bidang yang kamu tuju",
      "Latihan interview dengan feedback langsung",
      "Checklist 30 hari pertama mencari kerja",
    ],
  },
  {
    title: "Ngobrol Data: Baca Angka Tanpa Panik",
    slug: "ngobrol-data-baca-angka",
    category: "AI & Teknologi",
    format: "ONLINE",
    venue: "Google Meet",
    ...inDays(8, 20),
    capacity: 60,
    price: 0,
    status: "PUBLISHED",
    mentorName: "Bagas Pratama",
    mentorTitle: "Data Analyst",
    bannerColor: "#34D399",
    summary:
      "Sesi gratis untuk mulai nyaman membaca dashboard dan angka tanpa latar belakang statistik.",
    description: `Sesi pengantar yang santai untuk kamu yang sering disodori dashboard tapi bingung harus melihat apa.

Kita bahas cara membaca tren, membedakan perubahan yang berarti dan yang cuma noise, serta pertanyaan yang layak diajukan sebelum percaya sebuah angka.`,
    outcomes: [
      "Cara membaca tren tanpa salah tafsir",
      "3 pertanyaan wajib sebelum percaya sebuah angka",
    ],
  },
  {
    title: "Public Speaking untuk yang Introvert",
    slug: "public-speaking-introvert",
    category: "Komunikasi",
    format: "ONLINE",
    venue: "Zoom",
    ...inDays(36, 19),
    capacity: 50,
    price: 89000,
    status: "DRAFT",
    mentorName: "Nadia Rahman",
    mentorTitle: "Trainer komunikasi",
    bannerColor: "#8B7CF6",
    summary:
      "Bicara di depan orang tanpa harus berubah jadi orang lain.",
    description: `Kelas ini tidak akan menyuruh kamu jadi lebih ekstrovert. Fokusnya membangun cara bicara yang tetap terasa seperti diri kamu, tapi lebih jelas dan lebih tenang.`,
    outcomes: [
      "Struktur bicara yang mudah diingat saat gugup",
      "Teknik mengatur napas dan jeda",
    ],
  },
  {
    title: "Workshop Notion untuk Mahasiswa",
    slug: "workshop-notion-mahasiswa",
    category: "Kreatif",
    format: "ONLINE",
    venue: "Zoom",
    ...inDays(-14, 19),
    capacity: 70,
    price: 39000,
    status: "COMPLETED",
    mentorName: "Yoga Saputra",
    mentorTitle: "Productivity coach",
    bannerColor: "#1A2C4E",
    summary: "Menata catatan, tugas, dan jadwal kuliah dalam satu tempat.",
    description: `Sesi yang sudah berlalu, disimpan sebagai arsip.`,
    outcomes: ["Template dashboard kuliah siap pakai"],
  },
];

const PROMOS = [
  { code: "OTAKADEMI10", type: "PERCENT", value: 10, quota: 100 },
  { code: "EARLYBIRD", type: "PERCENT", value: 25, quota: 30 },
  { code: "HEMAT20K", type: "FIXED", value: 20000, quota: 50 },
];

const SAMPLE_PEOPLE = [
  ["Aditya Nugroho", "aditya.nugroho@example.com", "081234567801", "Universitas Padjadjaran", "Bandung", "Mahasiswa"],
  ["Bella Kusuma", "bella.kusuma@example.com", "081234567802", "Telkom University", "Bandung", "Mahasiswa"],
  ["Candra Wijaya", "candra.wijaya@example.com", "081234567803", "PT Maju Bersama", "Jakarta", "Karyawan"],
  ["Dewi Lestari", "dewi.lestari@example.com", "081234567804", "Universitas Indonesia", "Depok", "Fresh graduate"],
  ["Eko Prasetyo", "eko.prasetyo@example.com", "081234567805", "Startup Lokal", "Yogyakarta", "Karyawan"],
  ["Fitri Handayani", "fitri.handayani@example.com", "081234567806", "SMA Negeri 3", "Bandung", "Pelajar"],
  ["Gilang Ramadhan", "gilang.ramadhan@example.com", "081234567807", "Freelance", "Surabaya", "Freelancer"],
  ["Hana Safira", "hana.safira@example.com", "081234567808", "Institut Teknologi Bandung", "Bandung", "Mahasiswa"],
  ["Irfan Maulana", "irfan.maulana@example.com", "081234567809", "PT Digital Kreatif", "Jakarta", "Karyawan"],
  ["Jasmine Putri", "jasmine.putri@example.com", "081234567810", "Universitas Brawijaya", "Malang", "Mahasiswa"],
  ["Kevin Tanaka", "kevin.tanaka@example.com", "081234567811", "Agency Kreatif", "Jakarta", "Karyawan"],
  ["Laila Rahma", "laila.rahma@example.com", "081234567812", "Universitas Airlangga", "Surabaya", "Fresh graduate"],
];

const SOURCES = ["Instagram", "TikTok", "LinkedIn", "Teman / Rekomendasi", "Kampus / Sekolah", "Google"];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding Otakademi...\n");

  // ---- Admin users ----
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@otakademi.id").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "password";

  const adminHash = await hashPassword(adminPassword);

  await db.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, role: "SUPER_ADMIN", name: "Super Admin" },
    create: {
      email: adminEmail,
      name: "Super Admin",
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`  admin      : ${adminEmail}`);

  // A finance-role account, to demonstrate RBAC.
  const financeHash = await hashPassword("Finance2026!");
  await db.adminUser.upsert({
    where: { email: "finance@otakademi.id" },
    update: { passwordHash: financeHash },
    create: {
      email: "finance@otakademi.id",
      name: "Tim Finance",
      passwordHash: financeHash,
      role: "FINANCE",
    },
  });
  console.log("  admin      : finance@otakademi.id");

  // ---- Promos ----
  for (const promo of PROMOS) {
    await db.promo.upsert({
      where: { code: promo.code },
      update: {},
      create: promo,
    });
  }
  console.log(`  promos     : ${PROMOS.length}`);

  // ---- Events ----
  const eventIds = {};
  for (const data of EVENTS) {
    const event = await db.event.upsert({
      where: { slug: data.slug },
      update: { ...data },
      create: { ...data },
    });
    eventIds[data.slug] = event.id;
  }
  console.log(`  events     : ${EVENTS.length}`);

  // ---- Contact channels (CMS) ----
  // Seeded only when empty, so the team's later edits are never overwritten.
  const channelCount = await db.contactChannel.count();
  if (channelCount === 0) {
    await db.contactChannel.createMany({
      data: [
        {
          icon: "whatsapp",
          label: "WhatsApp",
          value: "+62 812-3456-7890",
          href: "https://wa.me/6281234567890",
          note: "Paling cepat. Senin-Jumat, 09.00-17.00 WIB.",
          primary: true,
          active: true,
          sortOrder: 10,
        },
        {
          icon: "mail",
          label: "Email",
          value: "hello@otakademi.id",
          href: "mailto:hello@otakademi.id",
          note: "Untuk pertanyaan detail, invoice, atau kerja sama.",
          primary: false,
          active: true,
          sortOrder: 20,
        },
        {
          icon: "external",
          label: "Instagram",
          value: "@otakademi",
          href: "https://instagram.com/otakademi",
          note: "Info kelas terbaru dan konten harian.",
          primary: false,
          active: true,
          sortOrder: 30,
        },
      ],
    });
    console.log("  channels   : 3");
  } else {
    console.log(`  channels   : ${channelCount} already present, skipping`);
  }

  // ---- Landing page blocks (CMS) ----
  const blockCount = await db.landingBlock.count();
  if (blockCount === 0) {
    const BLOCKS = [
      // Benefits
      { section: "BENEFIT", icon: "target", title: "Praktis, bukan teori panjang", body: "Setiap sesi dibangun dari kasus nyata. Kamu datang dengan masalah, pulang dengan cara menyelesaikannya.", sortOrder: 10 },
      { section: "BENEFIT", icon: "clock", title: "Ringkas tapi berbobot", body: "Format 2 jam yang padat. Dirancang untuk yang sibuk tapi tetap ingin berkembang.", sortOrder: 20 },
      { section: "BENEFIT", icon: "users", title: "Mentor yang benar-benar praktisi", body: "Diajar orang yang mengerjakan pekerjaannya sehari-hari, bukan sekadar membacakan slide.", sortOrder: 30 },
      { section: "BENEFIT", icon: "sparkles", title: "Selalu ada output", body: "Framework, template, atau workflow yang bisa langsung kamu pakai besok pagi.", sortOrder: 40 },
      // Steps
      { section: "STEP", icon: "01", title: "Pilih kelas", body: "Cari topik yang paling dekat dengan kebutuhanmu sekarang.", sortOrder: 10 },
      { section: "STEP", icon: "02", title: "Daftar cepat", body: "Tanpa bikin akun. Isi form singkat, selesai dalam satu menit.", sortOrder: 20 },
      { section: "STEP", icon: "03", title: "Bayar & terima tiket", body: "Event gratis langsung terkonfirmasi. Berbayar dapat tiket QR setelah lunas.", sortOrder: 30 },
      { section: "STEP", icon: "04", title: "Datang & praktik", body: "Ikut sesi, kerjakan latihannya, bawa pulang hasilnya.", sortOrder: 40 },
      // Testimonials
      { section: "TESTIMONIAL", title: "Dinda A.", meta: "Content Strategist", body: "Biasanya habis webinar cuma dapat semangat. Di sini aku pulang bawa workflow yang langsung kepakai buat kerjaan.", sortOrder: 10 },
      { section: "TESTIMONIAL", title: "Raka P.", meta: "Mahasiswa Tingkat Akhir", body: "Materinya nggak muter-muter. Dua jam tapi padat, dan mentornya jawab pertanyaan spesifik satu per satu.", sortOrder: 20 },
      { section: "TESTIMONIAL", title: "Sarah M.", meta: "Junior Product Analyst", body: "Kelas Cara Mikir Anti Asal bikin aku sadar cara aku ambil keputusan selama ini asal-asalan.", sortOrder: 30 },
      // FAQ
      { section: "FAQ", title: "Apakah harus punya akun untuk mendaftar?", body: "Tidak perlu. Cukup isi form pendaftaran dengan nama, email, dan nomor WhatsApp. Tiket dikirim ke email dan bisa diakses lewat link unik.", sortOrder: 10 },
      { section: "FAQ", title: "Bagaimana kalau kuota sudah penuh?", body: "Kamu otomatis masuk daftar tunggu. Kalau ada peserta yang batal, kami menghubungi urutan waitlist paling awal.", sortOrder: 20 },
      { section: "FAQ", title: "Event online-nya pakai apa?", body: "Sebagian besar lewat Zoom. Link dan panduan teknis dikirim ke email sebelum acara dan juga tersedia di halaman tiket kamu.", sortOrder: 30 },
      { section: "FAQ", title: "Bisa dapat sertifikat?", body: "Peserta yang hadir mendapat e-certificate kehadiran. Sertifikasi kompetensi formal belum termasuk di program saat ini.", sortOrder: 40 },
      { section: "FAQ", title: "Kalau berhalangan hadir, uangnya kembali?", body: "Pembatalan minimal 3 hari sebelum acara bisa direfund atau dipindah ke kelas berikutnya. Detailnya ada di halaman kebijakan refund.", sortOrder: 50 },
    ];
    await db.landingBlock.createMany({ data: BLOCKS });
    console.log(`  landing    : ${BLOCKS.length} blocks`);
  } else {
    console.log(`  landing    : ${blockCount} blocks already present, skipping`);
  }

  // ---- Participants ----
  const participantIds = [];
  for (const [name, email, phone, institution, city, occupation] of SAMPLE_PEOPLE) {
    // Email is indexed but not unique (a repeat attendee is still one person
    // row), so find-or-create rather than upsert.
    const existing = await db.participant.findFirst({ where: { email } });
    const p =
      existing ??
      (await db.participant.create({
        data: { name, email, phone, institution, city, occupation, consent: true },
      }));
    participantIds.push(p.id);
  }
  console.log(`  people     : ${participantIds.length}`);

  // ---- Registrations with a realistic status mix ----
  const existingRegs = await db.registration.count();
  if (existingRegs > 0) {
    console.log(`  regs       : ${existingRegs} already present, skipping`);
  } else {
    let created = 0;

    // Paid flagship event: mix of paid, awaiting, attended.
    const aiEvent = eventIds["ai-bukan-cuma-prompt"];
    for (let i = 0; i < 9; i++) {
      const status = i < 6 ? "CONFIRMED" : i < 8 ? "WAITING_PAYMENT" : "CANCELLED";
      const reg = await db.registration.create({
        data: {
          code: registrationCode(),
          eventId: aiEvent,
          participantId: participantIds[i],
          status,
          source: SOURCES[i % SOURCES.length],
          answers: { goal: "Mau rapiin workflow kerja pakai AI", experience: "Pernah coba sedikit" },
          createdAt: new Date(Date.now() - (9 - i) * 86400000),
        },
      });
      created++;

      if (status === "CONFIRMED") {
        await db.payment.create({
          data: {
            registrationId: reg.id,
            amount: 79000,
            status: "PAID",
            method: "bank_transfer",
            paidAt: new Date(Date.now() - (9 - i) * 86400000 + 3600000),
          },
        });
        await db.ticket.create({ data: { registrationId: reg.id, token: ticketToken() } });
      } else if (status === "WAITING_PAYMENT") {
        await db.payment.create({
          data: {
            registrationId: reg.id,
            amount: 79000,
            status: "PENDING",
            expiresAt: new Date(Date.now() + 20 * 3600000),
          },
        });
      }
    }

    // Free event: straight to confirmed.
    const freeEvent = eventIds["ngobrol-data-baca-angka"];
    for (let i = 0; i < 7; i++) {
      const reg = await db.registration.create({
        data: {
          code: registrationCode(),
          eventId: freeEvent,
          participantId: participantIds[(i + 3) % participantIds.length],
          status: "CONFIRMED",
          source: SOURCES[(i + 2) % SOURCES.length],
          createdAt: new Date(Date.now() - (7 - i) * 43200000),
        },
      });
      await db.ticket.create({ data: { registrationId: reg.id, token: ticketToken() } });
      created++;
    }

    // Small offline event with a promo applied.
    const careerEvent = eventIds["career-starter-lab"];
    for (let i = 0; i < 5; i++) {
      const reg = await db.registration.create({
        data: {
          code: registrationCode(),
          eventId: careerEvent,
          participantId: participantIds[(i + 6) % participantIds.length],
          status: "CONFIRMED",
          source: SOURCES[(i + 1) % SOURCES.length],
          promoCode: i < 2 ? "EARLYBIRD" : null,
          createdAt: new Date(Date.now() - (5 - i) * 86400000),
        },
      });
      await db.payment.create({
        data: {
          registrationId: reg.id,
          amount: i < 2 ? 96750 : 129000,
          status: "PAID",
          method: "bank_transfer",
          paidAt: new Date(Date.now() - (5 - i) * 86400000 + 7200000),
        },
      });
      await db.ticket.create({ data: { registrationId: reg.id, token: ticketToken() } });
      created++;
    }

    // Completed past event, with attendance recorded.
    const pastEvent = eventIds["workshop-notion-mahasiswa"];
    for (let i = 0; i < 8; i++) {
      const attended = i < 6;
      const reg = await db.registration.create({
        data: {
          code: registrationCode(),
          eventId: pastEvent,
          participantId: participantIds[i % participantIds.length],
          status: attended ? "ATTENDED" : "NO_SHOW",
          source: SOURCES[i % SOURCES.length],
          createdAt: new Date(Date.now() - (20 + i) * 86400000),
        },
      });
      await db.payment.create({
        data: {
          registrationId: reg.id,
          amount: 39000,
          status: "PAID",
          method: "bank_transfer",
          paidAt: new Date(Date.now() - (20 + i) * 86400000),
        },
      });
      await db.ticket.create({
        data: {
          registrationId: reg.id,
          token: ticketToken(),
          checkInAt: attended ? new Date(Date.now() - 14 * 86400000) : null,
        },
      });
      created++;
    }

    console.log(`  regs       : ${created}`);
  }

  // ---- Summary ----
  const [events, regs, paid, people] = await Promise.all([
    db.event.count(),
    db.registration.count(),
    db.payment.count({ where: { status: "PAID" } }),
    db.participant.count(),
  ]);

  console.log(`
Done.
  Events ........ ${events}
  Participants .. ${people}
  Registrations . ${regs}
  Paid .......... ${paid}

Admin login: ${adminEmail} / ${adminPassword}
`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
