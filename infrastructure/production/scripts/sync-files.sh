#!/usr/bin/env bash
# Baixa os arquivos de produção do repositório público em uma versão fixa (de preferência o SHA do
# commit) e os instala em /opt/wedding. Nada é instalado se algum download falhar.
#   sync-files.sh <git-ref>
set -euo pipefail

REF=${1:?uso: sync-files.sh <git-ref>}
APP_DIR=${APP_DIR:-/opt/wedding}
# shellcheck disable=SC1091
. "$APP_DIR/host.conf"

FILES=(
  compose.yaml
  Caddyfile
  scripts/backup.sh
  scripts/bootstrap-host.sh
  scripts/configure-env.sh
  scripts/deploy.sh
  scripts/release.sh
  scripts/reset-before-launch.sh
  scripts/restore.sh
  scripts/sync-files.sh
)

base="https://raw.githubusercontent.com/$GITHUB_REPOSITORY/$REF/infrastructure/production"
staging=$(mktemp -d)
trap 'rm -rf "$staging"' EXIT
mkdir -p "$staging/scripts"
for file in "${FILES[@]}"; do
  curl -fsSL "$base/$file" -o "$staging/$file"
done

mkdir -p "$APP_DIR/scripts"
for file in "${FILES[@]}"; do
  install -m "$([[ $file == scripts/* ]] && echo 0755 || echo 0644)" "$staging/$file" "$APP_DIR/$file"
done
echo "$REF" > "$APP_DIR/REVISION"
echo "Arquivos de produção sincronizados em $REF"
