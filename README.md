# Otakademi

Platform website, event, dan pendaftaran untuk Otakademi: landing page, penemuan event, pendaftaran, pembayaran, tiket QR, check-in, dan dashboard admin dalam satu aplikasi.

Alur utama: **Landing -> Event -> Registrasi -> Pembayaran -> Tiket/Check-in -> Laporan.**

## Fitur

- **Situs publik** - landing page, daftar & detail event, halaman tiket, halaman statis (tentang, institusi, FAQ, kontak, kebijakan).
- **Pendaftaran guest-first** - tanpa buat akun. Mendukung event gratis & berbayar, kode promo, dan daftar tunggu saat kuota penuh.
- **Kuota aman** - kuota tidak bisa terlampaui walau banyak orang mendaftar bersamaan (row-level lock di database).
- **Tiket & check-in** - tiket QR di-render di server, plus check-in via scan kamera atau input kode manual.
- **Dashboard admin** - kelola event (toggle aktif/non-aktif), peserta (CRM + export CSV), pembayaran, promo, check-in, dan laporan.
- **CMS ringan** - edit konten landing page (hero, keunggulan, langkah, testimoni, FAQ) dan halaman kontak langsung dari admin, tanpa deploy ulang.
- **Media event** - upload banner event dan foto mentor.

## Teknologi

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Prisma ORM + PostgreSQL
- Autentikasi admin: sesi cookie ber-HMAC + hashing scrypt bawaan Node

## Prasyarat

- Node.js v20 atau lebih baru (`node --version`)
- npm v10 atau lebih baru
- PostgreSQL 14+ yang sedang berjalan (`psql --version`)


## Setup (Linux / macOS)

### 1. Clone & install
```bash
git clone https://github.com/iqbaldz12/Otakademi.git otakademi
cd otakademi
npm install
```

### 2. Siapkan database PostgreSQL
```bash
sudo -u postgres psql
```
Di dalam prompt psql:
```sql
CREATE ROLE otakademi WITH LOGIN PASSWORD 'password-anda';
ALTER ROLE otakademi CREATEDB;
CREATE DATABASE otakademi_app OWNER otakademi;
```

### 3. Konfigurasi environment
```bash
cp .env.example .env
openssl rand -base64 48   # buat nilai AUTH_SECRET
```
Lalu isi `.env` (lihat bagian Variabel Environment).

### 4. Buat skema & data contoh
```bash
npm run db:push
npm run db:seed
```

### 5. Jalankan
```bash
npm run dev
```


## Setup (Windows)

Gunakan **PowerShell**. Pastikan PostgreSQL sudah terpasang (installer resmi dari postgresql.org) dan `psql` tersedia di PATH.

### 1. Clone & install
```powershell
git clone https://github.com/iqbaldz12/Otakademi.git otakademi
cd otakademi
npm install
```

### 2. Siapkan database PostgreSQL
Buka **SQL Shell (psql)** dari Start Menu, atau jalankan:
```powershell
psql -U postgres
```
Di dalam prompt psql:
```sql
CREATE ROLE otakademi WITH LOGIN PASSWORD 'password-anda';
ALTER ROLE otakademi CREATEDB;
CREATE DATABASE otakademi_app OWNER otakademi;
\q
```

### 3. Konfigurasi environment
```powershell
Copy-Item .env.example .env
```
Buat AUTH_SECRET acak (tanpa OpenSSL):
```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```
Buka `.env` dengan `notepad .env` lalu isi nilainya (lihat Variabel Environment).

### 4. Buat skema & data contoh
```powershell
npm run db:push
npm run db:seed
```

### 5. Jalankan
```powershell
npm run dev
```

> Jika `psql` tidak dikenali, tambahkan folder bin PostgreSQL (mis. `C:\Program Files\PostgreSQL\16\bin`) ke Path, lalu buka ulang PowerShell.

]633;E;printf -- '---\\n\\n';62a2e75e-22b6-489e-b040-8103334b9a10]633;C---

## Buka aplikasi

- **Situs publik** -> http://localhost:3000
- **Dashboard admin** -> http://localhost:3000/admin

Login admin memakai `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` dari `.env`. Seeding juga membuat akun Finance contoh: `finance@otakademi.id` / `Finance2026!`.

> Ganti password default sebelum dipakai di lingkungan publik.

---

## Variabel Environment

Isi file `.env` (jangan pernah di-commit):

```bash
DATABASE_URL="postgresql://otakademi:password-anda@127.0.0.1:5432/otakademi_app?schema=public"
AUTH_SECRET="tempel-hasil-generate-di-sini"
SEED_ADMIN_EMAIL="admin@otakademi.id"
SEED_ADMIN_PASSWORD="ganti-dengan-password-kuat"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
PAYMENT_WEBHOOK_SECRET="shared-secret-from-your-payment-provider"
```

---

## Perintah npm

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan (hot reload) |
| `npm run build` | Build produksi (menjalankan prisma generate lebih dulu) |
| `npm run start` | Jalankan hasil build produksi |
| `npm run typecheck` | Cek tipe TypeScript tanpa build |
| `npm run db:push` | Sinkronkan skema Prisma ke database |
| `npm run db:seed` | Isi data contoh |
| `npm run db:studio` | Buka Prisma Studio (GUI database) |
| `npm run db:reset` | Reset database lalu seed ulang |

]633;E;printf -- '---\\n\\n';9fb45920-284a-4e6e-90b0-590b9caaaf06]633;C---

## Struktur proyek

```
prisma/
  schema.prisma        Skema database
  seed.mjs             Data contoh
public/
  brand/               Logo & aset merek
  uploads/             Media upload admin (isinya di-ignore git)
src/
  app/
    (public)/          Halaman publik (landing, event, tiket, dll.)
    (admin-auth)/      Halaman login admin
    admin/             Dashboard admin (terproteksi)
    api/               Route API (events, tickets, payments, uploads, reports)
  components/          Komponen UI (site, admin, ui)
  lib/                 Util murni (format, validasi, domain)
  server/
    services/          Logika bisnis
    actions/           Server Actions
    auth.ts            Sesi & hashing password
```

---

## Menjalankan dengan Docker

Cara tercepat: aplikasi + PostgreSQL langsung jalan tanpa install apa pun selain Docker.

### Lokal

```bash
cp .env.example .env
# isi AUTH_SECRET di .env  (openssl rand -base64 48)
docker compose up --build
```

Buka http://localhost:3000. Container akan otomatis sinkron skema database dan mengisi data contoh (karena `RUN_SEED=true`). Setelah data nyata masuk, set `RUN_SEED=false` di `.env`.

### Production (otakademi.online)

Stack produksi menyertakan Caddy sebagai reverse proxy dengan HTTPS otomatis.

Prasyarat: DNS A record `otakademi.online` (dan `www`) mengarah ke IP server, port 80 & 443 terbuka.

```bash
cp .env.production.example .env.production
# cek/ubah: SEED_ADMIN_PASSWORD, dan sesuaikan email di Caddyfile
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Sertifikat HTTPS diterbitkan otomatis saat pertama diakses. Setelah deploy pertama berhasil, set `RUN_SEED=false` di `.env.production` lalu jalankan ulang perintah `up -d` untuk deploy berikutnya.

Perintah berguna:

```bash
docker compose logs -f app          # lihat log aplikasi
docker compose down                 # hentikan
docker compose down -v              # hentikan + hapus data (hati-hati)
```

---

## Deploy ke produksi (tanpa Docker)

1. Set semua variabel `.env` di host (`DATABASE_URL`, `AUTH_SECRET` acak, `NEXT_PUBLIC_SITE_URL` domain asli).
2. Jalankan skema: `npm run db:push`.
3. Build & start: `npm run build` lalu `npm run start`.

Catatan:

- Upload file disimpan di disk lokal (`public/uploads`). Untuk host serverless/multi-instance, ganti ke object storage (S3/R2) di `src/server/services/upload.service.ts`.
- Payment gateway belum dikunci ke provider tertentu. Endpoint `/api/payments/webhook` memverifikasi signature HMAC-SHA256 dengan `PAYMENT_WEBHOOK_SECRET`.
- Email/WhatsApp ditulis ke tabel outbox `Notification`; sambungkan ke provider pengirim saat implementasi.

## Lisensi

Proprietary - Copyright © Otakademi.
