# Emulador local do Cloudflare Pages para o ensaio. Mesma versão do Wrangler usada no deploy
# (frontend/package.json, script deploy:pages). workerd exige glibc, por isso não é Alpine.
FROM node:24-bookworm-slim
RUN npm install --global --no-audit --no-fund wrangler@4.125.0
ENV WRANGLER_SEND_METRICS=false CI=true
# O Wrangler grava estado em ./.wrangler; o build fica montado somente leitura em /site.
WORKDIR /tmp
ENTRYPOINT ["wrangler"]
