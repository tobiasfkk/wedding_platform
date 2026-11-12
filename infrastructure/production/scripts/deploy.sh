#!/usr/bin/env bash
# Atualiza o backend para a imagem informada e valida o health check; reverte se falhar.
#   deploy.sh <imagem-completa-com-tag>
set -euo pipefail

NEW_IMAGE=${1:?uso: deploy.sh <imagem:tag>}
APP_DIR=${APP_DIR:-/opt/wedding}
cd "$APP_DIR"

ENV_FILE=.env.production
COMPOSE=(docker compose --env-file "$ENV_FILE" -f compose.yaml)
PREVIOUS_IMAGE=$(grep -E '^API_IMAGE=' "$ENV_FILE" | cut -d= -f2-)

set_image() {
  sed -i "s|^API_IMAGE=.*|API_IMAGE=$1|" "$ENV_FILE"
}

# Baixa a imagem antes de mexer em qualquer coisa: tag inexistente aborta sem impacto.
# As imagens ficam públicas no GHCR; não há login nem credencial na instância.
docker image inspect "$NEW_IMAGE" >/dev/null 2>&1 || docker pull "$NEW_IMAGE"

# Backup antes de qualquer migração Flyway. Na primeira instalação ainda não há banco.
if [ -n "$("${COMPOSE[@]}" ps --quiet --status running postgres 2>/dev/null)" ]; then
  "$APP_DIR/scripts/backup.sh"
else
  echo "PostgreSQL ainda não está rodando (primeira instalação): backup ignorado."
fi

set_image "$NEW_IMAGE"
if "${COMPOSE[@]}" up --detach --wait --wait-timeout 300; then
  echo "deploy ok: $NEW_IMAGE"
  docker image prune -f >/dev/null
  exit 0
fi

echo "--- logs da API (falha) ---" >&2
"${COMPOSE[@]}" logs --tail 80 api >&2 || true
if [ "$PREVIOUS_IMAGE" = unset ] || [ "$PREVIOUS_IMAGE" = "$NEW_IMAGE" ]; then
  echo "falha no deploy e não há versão anterior para reverter." >&2
  exit 1
fi
echo "falha no deploy; revertendo para $PREVIOUS_IMAGE" >&2
set_image "$PREVIOUS_IMAGE"
"${COMPOSE[@]}" up --detach --wait --wait-timeout 300
echo "ATENÇÃO: se a nova versão aplicou migrações Flyway, avalie restaurar o backup (restore.sh)." >&2
exit 1
