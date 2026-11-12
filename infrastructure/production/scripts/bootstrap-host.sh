#!/usr/bin/env bash
# Prepara uma EC2 Amazon Linux 2023 (arm64) nova. Executar uma vez, como root, via SSM Session Manager.
set -euo pipefail

APP_DIR=/opt/wedding

dnf install -y docker cronie
systemctl enable --now docker crond

# Plugin do Compose v2 (não vem no pacote docker do AL2023)
mkdir -p /usr/local/lib/docker/cli-plugins
if [ ! -x /usr/local/lib/docker/cli-plugins/docker-compose ]; then
  curl -fsSL "https://github.com/docker/compose/releases/download/v2.40.3/docker-compose-linux-aarch64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

# Swap de 2 GB: rede de segurança para picos de memória (a instância tem 2 GB de RAM)
if ! swapon --show | grep -q /swapfile; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p "$APP_DIR/backups"
chmod 700 "$APP_DIR"

# Backup diário às 03:30 (horário do servidor, UTC)
cat > /etc/cron.d/wedding-backup <<'CRON'
30 3 * * * root /opt/wedding/scripts/backup.sh >> /var/log/wedding-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/wedding-backup

echo "Host preparado. Copie compose.yaml, Caddyfile, scripts/ e .env.production para $APP_DIR."
