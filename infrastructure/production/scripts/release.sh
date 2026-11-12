#!/usr/bin/env bash
# Publica uma versão: sincroniza os arquivos de produção do commit, regenera o .env.production e faz
# o deploy da imagem com backup, health check e rollback (deploy.sh). Chamado pelo workflow
# "Deploy backend" via SSM, como root.
#   release.sh <git-sha> <imagem:tag>
set -euo pipefail

REF=${1:?uso: release.sh <git-sha> <imagem:tag>}
IMAGE=${2:?uso: release.sh <git-sha> <imagem:tag>}
APP_DIR=${APP_DIR:-/opt/wedding}
# shellcheck disable=SC1091
. "$APP_DIR/host.conf"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
curl -fsSL "https://raw.githubusercontent.com/$GITHUB_REPOSITORY/$REF/infrastructure/production/scripts/sync-files.sh" -o "$tmp"
bash "$tmp" "$REF"

"$APP_DIR/scripts/configure-env.sh"
"$APP_DIR/scripts/deploy.sh" "$IMAGE"
