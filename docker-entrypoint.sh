#!/bin/sh
set -e

# Sync the database schema (retrying until Postgres accepts connections),
# optionally seed, then start the server. Both prisma db push and the seed are
# idempotent, so running this on every container start is safe.

echo "[entrypoint] menyinkronkan skema database..."
ATTEMPTS=0
until node_modules/.bin/prisma db push --skip-generate --accept-data-loss; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 20 ]; then
    echo "[entrypoint] gagal konek database setelah 20 percobaan. Berhenti."
    exit 1
  fi
  echo "[entrypoint] database belum siap, coba lagi dalam 3 detik... ($ATTEMPTS/20)"
  sleep 3
done

# RUN_SEED=true mengisi data contoh. Seed hanya menambah bila tabel kosong.
if [ "$RUN_SEED" = "true" ]; then
  echo "[entrypoint] menjalankan seed..."
  node prisma/seed.mjs || echo "[entrypoint] seed dilewati/gagal."
fi

echo "[entrypoint] memulai aplikasi..."
exec "$@"
