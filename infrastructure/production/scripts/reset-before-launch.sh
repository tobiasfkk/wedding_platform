#!/usr/bin/env bash
# Uso único, no dia da publicação: apaga os dados criados pelos testes de fumaça no ambiente real e
# recria o banco vazio (o Flyway recria o schema e o admin inicial). Em seguida trava o ambiente
# como "publicado": este script e os testes que gravam dados passam a ser recusados.
# Executar pelo Session Manager:  sudo /opt/wedding/scripts/reset-before-launch.sh
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/wedding}
MARKER="$APP_DIR/.launched"
cd "$APP_DIR"

if [ -e "$MARKER" ]; then
  echo "Ambiente já publicado em $(cat "$MARKER"). Este script não apaga dados reais." >&2
  exit 1
fi

COMPOSE=(docker compose --env-file .env.production -f compose.yaml)
echo "Convites cadastrados no banco agora:"
# "< /dev/null": o docker compose exec repassaria a entrada do terminal e engoliria a confirmação.
"${COMPOSE[@]}" exec -T postgres psql -U wedding -d wedding -At \
  -c "SELECT name FROM wedding.invitation ORDER BY created_at" < /dev/null | sed 's/^/  - /'
read -r -p "Isto APAGA todos os dados acima. Digite APAGAR para confirmar: " answer || answer=
[ "$answer" = APAGAR ] || { echo "cancelado"; exit 1; }

"${COMPOSE[@]}" stop api < /dev/null
"${COMPOSE[@]}" exec -T postgres psql -U wedding -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE wedding WITH (FORCE)" -c "CREATE DATABASE wedding OWNER wedding" < /dev/null
"${COMPOSE[@]}" up --detach --wait --wait-timeout 300 < /dev/null

date -u +%FT%TZ > "$MARKER"
chmod 400 "$MARKER"
echo "Banco recriado vazio e ambiente marcado como publicado."
