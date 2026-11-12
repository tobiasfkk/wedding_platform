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

# Login no ECR com a role da instância (sem chaves permanentes)
REGISTRY=${NEW_IMAGE%%/*}
if [[ "$REGISTRY" == *.dkr.ecr.*.amazonaws.com ]]; then
  REGION=$(echo "$REGISTRY" | cut -d. -f4)
  aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"
fi

# Baixa a imagem antes de mexer em qualquer coisa: tag inexistente aborta sem impacto
docker image inspect "$NEW_IMAGE" >/dev/null 2>&1 || docker pull "$NEW_IMAGE"

# Backup antes de qualquer migração Flyway
"$APP_DIR/scripts/backup.sh"

set_image "$NEW_IMAGE"
if "${COMPOSE[@]}" up --detach --wait --wait-timeout 180; then
  echo "deploy ok: $NEW_IMAGE"
  docker image prune -f >/dev/null
  exit 0
fi

echo "falha no deploy; revertendo para $PREVIOUS_IMAGE" >&2
set_image "$PREVIOUS_IMAGE"
"${COMPOSE[@]}" up --detach --wait --wait-timeout 180
echo "ATENÇÃO: se a nova versão aplicou migrações Flyway, avalie restaurar o backup (restore.sh)." >&2
exit 1
