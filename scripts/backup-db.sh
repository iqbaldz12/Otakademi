#!/bin/sh
# ===========================================================================
# Backup database PostgreSQL Otakademi dari container produksi.
#
# Jalankan dari root proyek di server:
#   ./scripts/backup-db.sh
#
# Hasil disimpan ke folder ./backups/otakademi_YYYY-MM-DD_HHMMSS.sql.gz
# dan backup lebih lama dari 14 hari otomatis dihapus.
# ===========================================================================
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_DIR="backups"
RETENTION_DAYS=14

info()  { printf '\033[1;34m[backup]\033[0m %s\n' "$1"; }
error() { printf '\033[1;31m[backup]\033[0m %s\n' "$1" >&2; }

if [ ! -f "$ENV_FILE" ]; then
  error "File $ENV_FILE tidak ada. Jalankan dari root proyek."
  exit 1
fi

# Ambil kredensial DB dari file env (tanpa mengekspornya ke lingkungan luar).
POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
  error "POSTGRES_USER atau POSTGRES_DB tidak ditemukan di $ENV_FILE."
  exit 1
fi

DC="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
OUTFILE="$BACKUP_DIR/otakademi_${TIMESTAMP}.sql.gz"

info "Membuat backup database '$POSTGRES_DB'..."
# shellcheck disable=SC2086
$DC exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUTFILE"

SIZE=$(du -h "$OUTFILE" | cut -f1)
info "Backup tersimpan: $OUTFILE ($SIZE)"

# Hapus backup lama.
info "Menghapus backup lebih lama dari $RETENTION_DAYS hari..."
find "$BACKUP_DIR" -name 'otakademi_*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

info "Selesai."
