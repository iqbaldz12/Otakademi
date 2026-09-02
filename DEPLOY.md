# Panduan Deploy Otakademi ke Server

Stack produksi berjalan dengan Docker Compose: **app (Next.js) + PostgreSQL + Caddy** (HTTPS otomatis via Let's Encrypt).

## Prasyarat

- Server Linux (Ubuntu/Debian) dengan RAM minimal ~2 GB dan disk ~10 GB lega.
- Docker + plugin `docker compose` terpasang.
- Domain dengan DNS **A record** yang mengarah ke IP publik server:
  - `otakademi.online` -> IP server
  - `www.otakademi.online` -> IP server
- Firewall membuka port **80**, **443**, dan **22** (SSH).

## Langkah Deploy Pertama

### 1. Pasang Docker (sekali saja)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # logout-login lagi setelah ini
```

### 2. Ambil kode

```bash
git clone <URL-repo> otakademi
cd otakademi
```

### 3. Siapkan environment produksi

```bash
cp .env.production.example .env.production
nano .env.production
```

Wajib ganti sebelum go-live:

| Variabel | Keterangan |
|---|---|
| `POSTGRES_PASSWORD` | Password DB acak yang kuat (samakan dengan yang ada di `DATABASE_URL`). |
| `DATABASE_URL` | Password harus sama persis dengan `POSTGRES_PASSWORD`. |
| `AUTH_SECRET` | Kunci sesi admin. Generate baru. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Kredensial admin pertama. Wajib ganti password default. |
| `NEXT_PUBLIC_SITE_URL` | URL publik, mis. `https://otakademi.online`. |
| `PAYMENT_WEBHOOK_SECRET` | Secret verifikasi webhook pembayaran. |
| `RUN_SEED` | `true` hanya untuk deploy pertama, lalu ubah ke `false`. |

Generate nilai acak:

```bash
openssl rand -base64 48   # AUTH_SECRET
openssl rand -hex 24      # POSTGRES_PASSWORD / PAYMENT_WEBHOOK_SECRET
```

> **Penting:** jangan pakai nilai contoh dari `.env.production.example` apa adanya. Nilai itu sudah ada di repo jadi dianggap bocor.

### 4. Sesuaikan domain (kalau bukan otakademi.online)

Edit `Caddyfile`: ganti `email` dan baris domain. Lalu sesuaikan `NEXT_PUBLIC_SITE_URL` di `.env.production`.

### 5. Pastikan DNS sudah mengarah

```bash
dig +short otakademi.online   # harus menampilkan IP server
```

Caddy hanya bisa menerbitkan sertifikat HTTPS setelah DNS benar.

### 6. Jalankan deploy

```bash
./scripts/deploy.sh
```

Skrip akan cek prasyarat, build image, menyalakan stack, dan menunggu app sehat.

### 7. Matikan seed setelah deploy pertama

Edit `.env.production`, set `RUN_SEED="false"`, lalu jalankan ulang:

```bash
./scripts/deploy.sh
```

## Opsi B: Server Sudah Punya Caddy Sendiri (host-level)

Kalau Caddy sudah terpasang langsung di server (bukan container) dan meng-handle beberapa domain, gunakan compose varian tanpa Caddy: `docker-compose.host-caddy.yml`. App hanya di-bind ke `127.0.0.1:3000`, dan Caddy host yang meneruskan trafik.

### 1. Deploy stack (tanpa container Caddy)

Langkah 1-5 sama seperti di atas. Yang berbeda hanya perintah deploy — beri tahu skrip untuk memakai file compose host-caddy:

```bash
COMPOSE_FILE=docker-compose.host-caddy.yml ./scripts/deploy.sh
```

Atau manual:

```bash
docker compose -f docker-compose.host-caddy.yml --env-file .env.production up -d --build
```

Setelah ini, app dapat diakses lokal di `http://127.0.0.1:3000` (belum publik).

### 2. Tambahkan reverse proxy di Caddy host

Edit Caddyfile host (biasanya `/etc/caddy/Caddyfile`) dan tambahkan blok berikut. Contohnya juga tersedia di `caddy-host.example.conf`:

```caddy
otakademi.online, www.otakademi.online {
	reverse_proxy 127.0.0.1:3000
	encode gzip zstd
}
```

Lalu reload Caddy:

```bash
sudo systemctl reload caddy
```

Caddy host akan mengurus sertifikat HTTPS Let's Encrypt otomatis untuk `otakademi.online`.

### 3. Update & operasional (Opsi B)

Semua perintah operasional sama, cukup pakai file compose host-caddy:

```bash
COMPOSE_FILE=docker-compose.host-caddy.yml ./scripts/deploy.sh    # update
docker compose -f docker-compose.host-caddy.yml --env-file .env.production ps
docker compose -f docker-compose.host-caddy.yml --env-file .env.production logs -f app
```

Skrip backup tidak terpengaruh (tetap membaca kredensial dari `.env.production`), tapi jika kamu memakai file compose non-default, jalankan dengan:

```bash
COMPOSE_FILE=docker-compose.host-caddy.yml ./scripts/backup-db.sh
```

## Update Aplikasi

Setelah ada perubahan kode:

```bash
./scripts/deploy.sh   # otomatis git pull + rebuild + restart
```

Jika tidak ingin `git pull` otomatis: `SKIP_GIT_PULL=true ./scripts/deploy.sh`

## Backup Database

```bash
./scripts/backup-db.sh
```

Hasil tersimpan di `./backups/` (format `.sql.gz`), backup > 14 hari dihapus otomatis.

Otomatiskan lewat cron (mis. tiap hari jam 02:00):

```bash
crontab -e
# tambahkan baris:
0 2 * * * cd /path/ke/otakademi && ./scripts/backup-db.sh >> backups/cron.log 2>&1
```

Restore dari backup:

```bash
gunzip -c backups/otakademi_TANGGAL.sql.gz | \
  docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db \
  psql -U otakademi -d otakademi_app
```

## Perintah Operasional

```bash
DC="docker compose -f docker-compose.prod.yml --env-file .env.production"

$DC ps              # status container
$DC logs -f app     # log aplikasi
$DC logs -f caddy   # log Caddy (berguna saat cek sertifikat HTTPS)
$DC down            # matikan semua (data DB tetap aman di volume)
$DC restart app     # restart hanya app
```

## Catatan

- Container **app** dan **db** tidak membuka port ke publik. Semua trafik luar lewat Caddy (HTTPS).
- Data DB persisten di volume `otakademi_pgdata`; file upload di `otakademi_uploads`. `docker compose down` tidak menghapusnya (gunakan `down -v` bila benar-benar ingin hapus).
- `.env.production` berisi secret asli dan sudah masuk `.gitignore` — jangan pernah di-commit.
