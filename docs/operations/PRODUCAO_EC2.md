# Produção na EC2

Runbook da hospedagem definida no [ADR 0008](../adr/0008-hospedagem-ec2-unica.md): uma EC2 com
Caddy, Spring Boot e PostgreSQL em Docker Compose. Objetivo do projeto: operar dentro da conta
gratuita da AWS, sem custo para o proprietário. A sequência da primeira publicação está em
[LANCAMENTO](LANCAMENTO.md).

## Peças

| Onde | O quê |
|---|---|
| `infrastructure/aws/wedding-stack.yaml` | Template CloudFormation: EC2, Elastic IP, security group, bucket de backup, roles e AWS Budgets |
| `infrastructure/production/` | `compose.yaml`, `Caddyfile` e scripts do host |
| `.github/workflows/publish-backend-image.yml` | Imagem `linux/arm64` no GHCR após a CI da `main` |
| `.github/workflows/deploy-backend-production.yml` | Deploy da API via SSM (OIDC, sem SSH) |
| `.github/workflows/deploy-frontend-production.yml` | Deploy do site no Cloudflare Pages |
| `.github/workflows/production-smoke-tests.yml` | Testes de fumaça contra o ambiente publicado |

## Regra de custo

O template cria somente: 1 EC2 `t4g` com créditos de CPU **standard** (nunca cobra CPU extra),
1 volume gp3 de 20 GB, 1 Elastic IP, 1 bucket S3 com expiração de 30 dias, roles IAM e um orçamento
do AWS Budgets. Imagens ficam no GHCR (gratuito para pacotes públicos) e segredos no Parameter
Store padrão (gratuito). Não criar NAT Gateway, balanceador, RDS, Aurora, ECS/Fargate, ElastiCache,
ECR nem Secrets Manager.

## Segredos

Gerados uma única vez pelo `configure-env.sh` e guardados como SecureString no Parameter Store:

| Parâmetro | Uso |
|---|---|
| `/wedding/production/postgres-password` | Senha do PostgreSQL |
| `/wedding/production/invitation-code-pepper` | Pepper dos códigos de convite. Nunca altere depois de enviar os links |
| `/wedding/production/admin-password` | Senha do administrador inicial (`AdminEmail` do template) |

Recriar a EC2 preserva os três: links já enviados continuam válidos. O `.env.production` da
instância é regenerado a cada deploy e nunca deve ser editado à mão.

## Como o host funciona

- **Criação:** o user-data grava `/opt/wedding/host.conf` e executa `bootstrap-host.sh`, que instala
  Docker e Compose (versão e checksum fixados), cria swap de 2 GB, baixa os arquivos de produção,
  gera o `.env.production` e agenda o backup diário. Log: `/var/log/wedding-bootstrap.log`.
- **Deploy:** o workflow "Deploy backend" exige CI verde e imagem pública para o commit e envia pela
  SSM `release.sh <sha> <imagem>`: sincroniza os arquivos daquele commit (`sync-files.sh`),
  regenera o `.env.production` e executa `deploy.sh`, que faz backup, sobe a nova imagem, espera o
  health check e reverte para a anterior se falhar.
- **Acesso administrativo:** EC2 > Connect > Session Manager. Não há SSH nem par de chaves.

## Frontend

O build de produção do Angular usa `frontend/src/environments/environment.production.ts`, que aponta
para `https://api.casamentodudatobi.tobiaskiefer.com.br`. Frontend e API ficam no mesmo site
(`tobiaskiefer.com.br`), então o cookie de sessão `SameSite=Lax` e o CSRF continuam funcionando. O
backend recebe `AUTH_ALLOWED_ORIGINS=https://casamentodudatobi.tobiaskiefer.com.br`.

Previews em `*.pages.dev` usam o mesmo build, mas pertencem a outro site e não conseguem autenticar na
API de produção. Eles servem apenas para revisão visual.

## DNS

O DNS de `tobiaskiefer.com.br` está no Cloudflare (`heidi`/`keenan.ns.cloudflare.com`), com o
domínio registrado no Registro.br. O registro `A` `api.casamentodudatobi` aponta para o Elastic IP
**sem proxy** (nuvem cinza): o Caddy emite o certificado e o IP real do convidado chega ao limite de
tentativas. O registro do site é criado pelo próprio Pages ao conectar o domínio personalizado.

## Ensaio de produção local

Antes de qualquer publicação, rode o ensaio. Ele usa a mesma imagem do backend, o mesmo
`compose.yaml` e `Caddyfile` de produção, o build de produção do frontend servido pelo Wrangler (o
emulador oficial do Cloudflare Pages) e os domínios reais resolvidos para o Caddy dentro da rede
Docker, com HTTPS da CA local do Caddy. Nada é publicado e nenhuma porta é aberta no host.

```bash
(cd backend && ./mvnw --batch-mode -DskipTests package)
(cd frontend && npm ci && npm run build)
infrastructure/production/rehearsal/run-rehearsal.sh
```

Os testes rodam no Chromium, no WebKit/iPhone e no Chromium/Android: a jornada crítica completa
(admin, convite, RSVP, acompanhante e painel) com a API em outro subdomínio, e uma verificação de
"nenhum erro" que abre cada rota diretamente e falha com qualquer exceção JavaScript, erro no
console, requisição com falha ou resposta HTTP de erro. Argumentos extras vão para o Playwright, por
exemplo `--project webkit-iphone --repeat-each 10`.

Diferenças em relação à produção: certificados da CA local, limite de tentativas de RSVP elevado
(todos os navegadores do ensaio saem do mesmo IP) e o Wrangler local no lugar da rede do Cloudflare.

## Backup e restauração

- `backup.sh` roda por cron às 06:30 UTC (03:30 em Brasília), mantém 7 dias em
  `/opt/wedding/backups` e envia ao S3, onde os objetos expiram em 30 dias. Também roda antes de
  cada deploy.
- `sudo /opt/wedding/scripts/restore.sh <dump>` restaura em um banco temporário, mostra contagens por
  tabela e o remove. Para baixar um dump do S3:
  `aws s3 cp s3://<bucket>/postgres/<arquivo>.dump /opt/wedding/backups/`.
- `sudo /opt/wedding/scripts/restore.sh <dump> --replace-live` substitui o banco de produção após
  confirmação.
- RPO de 24 h (um dump por dia) e RTO de 4 h.

## Monitoramento mínimo

- Monitor externo gratuito (por exemplo UptimeRobot) em
  `https://api.casamentodudatobi.tobiaskiefer.com.br/api/public/pix`. O `/actuator` é bloqueado no proxy.
- "Production smoke tests" com escopo `readonly` pode rodar a qualquer momento.
- AWS Budgets com alertas por e-mail; acompanhe os créditos em Billing semanalmente até o casamento.
- Logs: `sudo docker compose --env-file /opt/wedding/.env.production -f /opt/wedding/compose.yaml logs --tail 200 api`
  (rotação de 3 × 10 MB por container).

## Limitações conhecidas

- A EC2 é ponto único de falha para API e banco.
- Os contadores de tentativas de login e RSVP ficam em memória e zeram a cada reinício da API.
- Atualizações do sistema operacional são manuais: `sudo dnf update -y` e reinício agendado fora do
  período de RSVP.
