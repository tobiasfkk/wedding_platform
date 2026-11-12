#!/usr/bin/env bash
# Backup lógico diário do PostgreSQL: cópia local (7 dias) e envio ao S3.
set -euo pipefail
umask 077  # dumps contêm dados pessoais dos convidados

APP_DIR=${APP_DIR:-/opt/wedding}
cd "$APP_DIR"
set -a
. ./.env.production
set +a

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="$APP_DIR/backups/wedding-$STAMP.dump"

docker compose --env-file .env.production -f compose.yaml exec -T postgres \
  pg_dump --username "${POSTGRES_USER:-wedding}" --dbname "${POSTGRES_DB:-wedding}" \
  --format=custom --no-owner > "$FILE.partial"
mv "$FILE.partial" "$FILE"

# Um dump vazio ou truncado não pode passar por backup válido
[ "$(stat -c %s "$FILE")" -gt 1024 ] || { echo "dump suspeito (muito pequeno): $FILE" >&2; exit 1; }

if [ -n "${BACKUP_S3_URI:-}" ]; then
  aws s3 cp "$FILE" "$BACKUP_S3_URI/$(basename "$FILE")" --only-show-errors
fi

find "$APP_DIR/backups" -name 'wedding-*.dump' -mtime +7 -delete
echo "$(date -u +%FT%TZ) backup ok: $(basename "$FILE")"
