#!/bin/sh
# ===========================================================================
# Skrip deploy Otakademi ke server produksi.
#
# Jalankan dari root proyek di server:
#   ./scripts/deploy.sh
#
# Skrip ini:
#   1. Memastikan Docker & file env tersedia.
#   2. (opsional) git pull untuk mengambil kode terbaru.
#   3. Build image dan menyalakan stack produksi (app + db + caddy).
#   4. Menunggu container app sehat lalu menampilkan status.
#
# Aman dijalankan berulang: dipakai untuk deploy pertama maupun update.
# ===========================================================================
set -eu

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
APP_SERVICE="app"

# Warna sederhana (diabaikan bila terminal tak mendukung).
info()  { printf '\033[1;34m[deploy]\033[0m %s\n' "$1"; }
warn()  { printf '\033[1;33m[deploy]\033[0m %s\n' "$1"; }
error() { printf '\033[1;31m[deploy]\033[0m %s\n' "$1" >&2; }

# --- 1. Cek prasyarat -------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  error "Docker belum terpasang. Pasang dulu: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  error "Plugin 'docker compose' tidak ditemukan. Pastikan Docker versi baru terpasang."
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  error "File $COMPOSE_FILE tidak ada. Jalankan skrip ini dari root proyek."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  error "File $ENV_FILE belum ada."
  warn  "Salin dari template lalu isi nilainya:"
  warn  "  cp .env.production.example $ENV_FILE && nano $ENV_FILE"
  exit 1
fi

# Peringatkan bila masih memakai nilai contoh yang tidak aman.
if grep -q "GANTI-password-kuat-sebelum-deploy" "$ENV_FILE"; then
  error "SEED_ADMIN_PASSWORD di $ENV_FILE masih nilai contoh. Ganti dulu sebelum deploy."
  exit 1
fi

DC="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

# --- 2. Ambil kode terbaru (opsional) --------------------------------------
if [ "${SKIP_GIT_PULL:-false}" != "true" ] && [ -d .git ]; then
  info "Mengambil kode terbaru (git pull)..."
  git pull --ff-only || warn "git pull dilewati/gagal, lanjut dengan kode saat ini."
fi

# --- 3. Build & jalankan ----------------------------------------------------
info "Build image dan menyalakan stack produksi..."
# shellcheck disable=SC2086
$DC up -d --build

# --- 4. Tunggu app sehat ----------------------------------------------------
info "Menunggu container app siap..."
ATTEMPTS=0
MAX_ATTEMPTS=30
until [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; do
  STATUS=$($DC ps --format '{{.Service}} {{.State}}' 2>/dev/null | grep "^$APP_SERVICE " | awk '{print $2}' || true)
  if [ "$STATUS" = "running" ]; then
    info "Container app berjalan."
    break
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
    error "Container app belum berjalan setelah $MAX_ATTEMPTS percobaan. Cek log:"
    error "  $DC logs $APP_SERVICE"
    exit 1
  fi
  sleep 3
done

# --- 5. Ringkasan -----------------------------------------------------------
info "Status container:"
# shellcheck disable=SC2086
$DC ps

info "Selesai. Pantau log dengan:"
info "  $DC logs -f $APP_SERVICE"
warn "Ingat: setelah deploy pertama, set RUN_SEED=\"false\" di $ENV_FILE lalu jalankan ulang skrip ini."
