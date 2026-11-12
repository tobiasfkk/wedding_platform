#!/usr/bin/env bash
# Ensaio de produção local: mesma imagem do backend, mesmo compose.yaml e Caddyfile de produção, build
# de produção do frontend servido pelo Wrangler (Cloudflare Pages) e os domínios reais resolvidos
# para o Caddy dentro da rede Docker. Nada é publicado e nenhuma porta é aberta no host.
#
# Pré-requisitos: Docker; JAR do backend e build de produção do frontend já gerados:
#   (backend)  ./mvnw --batch-mode -DskipTests package
#   (frontend) npm ci && npm run build
#
# Uso: infrastructure/production/rehearsal/run-rehearsal.sh [argumentos extras do Playwright]
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
SITE_DOMAIN=casamentodudaetobias.tobiaskiefer.com.br
API_DOMAIN=api.$SITE_DOMAIN
PROJECT=wedding-rehearsal
IMAGE=wedding-backend:rehearsal

JAR=$REPO/backend/target/wedding-backend-0.0.1-SNAPSHOT.jar
DIST=$REPO/frontend/dist/wedding-frontend/browser
[ -f "$JAR" ] || { echo "JAR ausente: rode ./mvnw -DskipTests package em backend/" >&2; exit 1; }
[ -f "$DIST/index.html" ] || { echo "Build ausente: rode npm run build em frontend/" >&2; exit 1; }
grep -rqs "https://$API_DOMAIN" "$DIST" \
  || { echo "O build em $DIST não aponta para https://$API_DOMAIN" >&2; exit 1; }

ENV_FILE=$(mktemp)
secret() { head -c 48 /dev/urandom | base64 | tr -d '/+=\n' | head -c 48; }
cat > "$ENV_FILE" <<ENV
API_IMAGE=$IMAGE
API_DOMAIN=$API_DOMAIN
SITE_DOMAIN=$SITE_DOMAIN
ACME_EMAIL=ensaio@example.test
PUBLIC_SITE_URL=https://$SITE_DOMAIN
AUTH_ALLOWED_ORIGINS=https://$SITE_DOMAIN
POSTGRES_PASSWORD=$(secret)
INVITATION_CODE_PEPPER=$(secret)
ADMIN_INITIAL_EMAIL=ensaio-admin@example.test
ADMIN_INITIAL_PASSWORD=$(secret)
ENV

COMPOSE=(docker compose --project-name "$PROJECT" --env-file "$ENV_FILE"
  --project-directory "$REPO/infrastructure/production"
  -f "$REPO/infrastructure/production/compose.yaml" -f "$HERE/compose.rehearsal.yaml")

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "--- últimos logs (falha) ---" >&2
    "${COMPOSE[@]}" logs --tail 60 api caddy pages >&2 || true
  fi
  "${COMPOSE[@]}" --profile tests down --volumes --remove-orphans >/dev/null 2>&1 || true
  rm -f "$ENV_FILE"
  exit "$status"
}
trap cleanup EXIT

echo "==> Imagem do backend"
docker build --quiet --tag "$IMAGE" "$REPO/backend" >/dev/null

echo "==> Emulador do Cloudflare Pages"
"${COMPOSE[@]}" build --quiet pages

echo "==> Subindo PostgreSQL, API, Caddy e Pages"
"${COMPOSE[@]}" up --detach --wait --wait-timeout 300 postgres api caddy pages

echo "==> Memória em repouso"
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' | grep "$PROJECT" || true

echo "==> Playwright (Chromium, WebKit/iPhone, Chromium/Android)"
"${COMPOSE[@]}" --profile tests run --rm playwright \
  node node_modules/@playwright/test/cli.js test --config playwright.rehearsal.config.ts "$@"

echo "==> Memória após os testes"
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' | grep "$PROJECT" || true
