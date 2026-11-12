#!/usr/bin/env bash
# Gera /opt/wedding/.env.production a partir de host.conf e do AWS SSM Parameter Store.
# Segredos que ainda não existem são gerados uma única vez e guardados como SecureString; nas
# execuções seguintes são sempre lidos de lá. Assim, recriar a EC2 preserva a senha do banco, a
# senha do admin e o pepper dos convites (os links já enviados continuam válidos).
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/wedding}
AWS=${AWS_CLI:-aws}
# shellcheck disable=SC1091
. "$APP_DIR/host.conf"

secret() {
  local name="$SSM_PREFIX/$1" value
  if ! value=$($AWS ssm get-parameter --region "$AWS_REGION" --name "$name" --with-decryption \
      --query Parameter.Value --output text 2>/dev/null); then
    value=$(head -c 64 /dev/urandom | base64 | tr -d '/+=\n' | cut -c1-48)
    # --no-overwrite: se outra execução criou o parâmetro antes, falha em vez de substituí-lo.
    $AWS ssm put-parameter --region "$AWS_REGION" --name "$name" --type SecureString \
      --value "$value" --no-overwrite >/dev/null
    value=$($AWS ssm get-parameter --region "$AWS_REGION" --name "$name" --with-decryption \
      --query Parameter.Value --output text)
  fi
  [ ${#value} -ge 32 ] || { echo "Parâmetro $name inválido" >&2; exit 1; }
  printf '%s' "$value"
}

POSTGRES_PASSWORD=$(secret postgres-password)
INVITATION_CODE_PEPPER=$(secret invitation-code-pepper)
ADMIN_INITIAL_PASSWORD=$(secret admin-password)

# Preserva a imagem em uso (atualizada pelo deploy.sh).
API_IMAGE="unset"
if [ -f "$APP_DIR/.env.production" ]; then
  API_IMAGE=$(grep -E '^API_IMAGE=' "$APP_DIR/.env.production" | cut -d= -f2- || echo unset)
fi

umask 077
cat > "$APP_DIR/.env.production.tmp" <<ENV
# Gerado por configure-env.sh. Não edite: os segredos vêm do Parameter Store ($SSM_PREFIX).
API_IMAGE=$API_IMAGE
API_DOMAIN=$API_DOMAIN
ACME_EMAIL=$ACME_EMAIL
PUBLIC_SITE_URL=https://$SITE_DOMAIN
AUTH_ALLOWED_ORIGINS=https://$SITE_DOMAIN
POSTGRES_DB=wedding
POSTGRES_USER=wedding
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
INVITATION_CODE_PEPPER=$INVITATION_CODE_PEPPER
INVITATION_CODE_PEPPER_VERSION=1
ADMIN_INITIAL_EMAIL=$ADMIN_EMAIL
ADMIN_INITIAL_PASSWORD=$ADMIN_INITIAL_PASSWORD
BACKUP_S3_URI=$BACKUP_S3_URI
ENV
mv "$APP_DIR/.env.production.tmp" "$APP_DIR/.env.production"
echo ".env.production atualizado (imagem: $API_IMAGE)"
