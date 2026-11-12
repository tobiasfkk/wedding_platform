#!/usr/bin/env bash
# Restaura um dump em um banco. Por padrão restaura em um banco TEMPORÁRIO ("wedding_restore_test")
# para validar o backup sem tocar nos dados reais.
#
#   restore.sh <arquivo.dump>                 -> testa em wedding_restore_test e mostra contagens
#   restore.sh <arquivo.dump> --replace-live  -> SUBSTITUI o banco de produção (pede confirmação)
set -euo pipefail

DUMP=${1:?uso: restore.sh <arquivo.dump> [--replace-live]}
MODE=${2:-}
APP_DIR=${APP_DIR:-/opt/wedding}
cd "$APP_DIR"
set -a
. ./.env.production
set +a

DB=${POSTGRES_DB:-wedding}
USER_NAME=${POSTGRES_USER:-wedding}
COMPOSE=(docker compose --env-file .env.production -f compose.yaml)

if [ "$MODE" = "--replace-live" ]; then
  read -r -p "Isto APAGA o banco '$DB' e restaura '$DUMP'. Digite o nome do banco para confirmar: " answer
  [ "$answer" = "$DB" ] || { echo "cancelado"; exit 1; }
  "${COMPOSE[@]}" stop api
  TARGET=$DB
else
  TARGET=wedding_restore_test
fi

"${COMPOSE[@]}" exec -T postgres psql -U "$USER_NAME" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$TARGET\" WITH (FORCE)" -c "CREATE DATABASE \"$TARGET\""
"${COMPOSE[@]}" exec -T postgres pg_restore -U "$USER_NAME" -d "$TARGET" --no-owner --exit-on-error < "$DUMP"

echo "Contagens no banco restaurado ($TARGET):"
"${COMPOSE[@]}" exec -T postgres psql -U "$USER_NAME" -d "$TARGET" -c \
  "SELECT relname AS tabela, n_live_tup AS linhas_estimadas FROM pg_stat_user_tables ORDER BY 1"

if [ "$MODE" = "--replace-live" ]; then
  "${COMPOSE[@]}" start api
else
  "${COMPOSE[@]}" exec -T postgres psql -U "$USER_NAME" -d postgres -c "DROP DATABASE \"$TARGET\" WITH (FORCE)"
  echo "Teste de restauração concluído; banco temporário removido."
fi
