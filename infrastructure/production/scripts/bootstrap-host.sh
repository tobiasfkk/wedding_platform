#!/usr/bin/env bash
# Prepara uma EC2 Amazon Linux 2023 (arm64). Chamado pelo user-data do template CloudFormation na
# criação da instância, como root. Idempotente: pode ser executado de novo pelo Session Manager.
#   bootstrap-host.sh <git-ref>
# Pré-requisito: /opt/wedding/host.conf (gravado pelo user-data).
set -euo pipefail

REF=${1:?uso: bootstrap-host.sh <git-ref>}
APP_DIR=${APP_DIR:-/opt/wedding}
COMPOSE_VERSION=v5.7.1
COMPOSE_SHA256=f2f49f903240895fa764c0dca3a14548b754ad9426f6b609ccaf55ec5a3aa2a5

[ -f "$APP_DIR/host.conf" ] || { echo "$APP_DIR/host.conf ausente" >&2; exit 1; }
# shellcheck disable=SC1091
. "$APP_DIR/host.conf"

dnf install -y docker cronie
systemctl enable --now docker crond

# Plugin do Docker Compose (não vem no pacote docker do AL2023), com verificação de integridade.
plugin=/usr/local/lib/docker/cli-plugins/docker-compose
if ! docker compose version 2>/dev/null | grep -q "${COMPOSE_VERSION#v}"; then
  mkdir -p "$(dirname "$plugin")"
  tmp=$(mktemp)
  curl -fsSL "https://github.com/docker/compose/releases/download/$COMPOSE_VERSION/docker-compose-linux-aarch64" -o "$tmp"
  echo "$COMPOSE_SHA256  $tmp" | sha256sum -c -
  install -m 0755 "$tmp" "$plugin"
  rm -f "$tmp"
fi
docker compose version

# Swap de 2 GB: rede de segurança para picos de memória.
if ! swapon --show | grep -q /swapfile; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p "$APP_DIR/backups" "$APP_DIR/scripts"
chmod 700 "$APP_DIR"

# Arquivos de produção na versão pedida e .env.production com os segredos do Parameter Store.
tmp=$(mktemp)
curl -fsSL "https://raw.githubusercontent.com/$GITHUB_REPOSITORY/$REF/infrastructure/production/scripts/sync-files.sh" -o "$tmp"
bash "$tmp" "$REF"
rm -f "$tmp"
"$APP_DIR/scripts/configure-env.sh"

# Backup diário às 06:30 UTC (03:30 em Brasília).
cat > /etc/cron.d/wedding-backup <<CRON
30 6 * * * root $APP_DIR/scripts/backup.sh >> /var/log/wedding-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/wedding-backup

echo "Host preparado em $APP_DIR (ref $REF). O primeiro deploy é feito pelo workflow Deploy backend."
