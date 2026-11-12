# Produção na EC2

Runbook da hospedagem definida no [ADR 0008](../adr/0008-hospedagem-ec2-unica.md): uma EC2 com
Caddy, Spring Boot e PostgreSQL em Docker Compose. Objetivo do projeto: operar dentro da conta
gratuita da AWS, sem custo para o proprietário.

Arquivos versionados em `infrastructure/production/`: `compose.yaml`, `Caddyfile`,
`.env.production.example` e `scripts/` (`bootstrap-host.sh`, `deploy.sh`, `backup.sh`,
`restore.sh`).

## Regra de custo

Criar somente: 1 EC2, 1 volume EBS gp3, 1 Elastic IP, 1 repositório ECR, 1 bucket S3, 1 role IAM
da instância e AWS Budgets. Não criar NAT Gateway, balanceador, RDS, Aurora, ECS/Fargate,
ElastiCache nem Secrets Manager. Qualquer outro recurso muda o consumo dos créditos.

## Passo a passo na AWS (ação do proprietário)

1. Criar a conta no plano Free e ativar MFA no usuário raiz. Região: `sa-east-1`.
2. Billing > Budgets: criar orçamento com alertas em 50%, 80% e 95% dos créditos, e-mail ativo.
3. Calcular no AWS Pricing Calculator `t4g.small` + 30 GB gp3 + 1 IPv4 por ~6 meses e registrar o
   resultado no ADR 0008.
4. S3: bucket privado `wedding-backups-<sufixo>` com bloqueio de acesso público, criptografia padrão
   e regra de ciclo de vida que expira objetos em 30 dias.
5. ECR: repositório privado `wedding-backend` com regra de ciclo de vida mantendo as 5 últimas
   imagens.
6. IAM: role `wedding-ec2` para a instância com as políticas gerenciadas
   `AmazonSSMManagedInstanceCore` e uma política própria com `s3:PutObject`/`s3:GetObject`/`s3:ListBucket`
   no bucket de backup e `ecr:GetAuthorizationToken` + leitura (`ecr:BatchGetImage`,
   `ecr:GetDownloadUrlForLayer`) no repositório.
7. EC2: Amazon Linux 2023 **arm64**, `t4g.small`, volume gp3 de 30 GB criptografado, role
   `wedding-ec2`, **sem par de chaves**. Security group com entrada apenas nas portas `80` (emissão
   e renovação do certificado, redirecionamento) e `443`. Sem SSH.
8. Elastic IP associado à instância.
9. DNS no Cloudflare: registro `A` `api.casamentoduda` apontando para o Elastic IP com o proxy
   **desativado** (nuvem cinza), para o Caddy emitir o certificado e para o IP real chegar à API.

## Primeira instalação

Acesso: Systems Manager > Session Manager (sem SSH).

```bash
sudo bash infrastructure/production/scripts/bootstrap-host.sh
```

Copie `compose.yaml`, `Caddyfile` e `scripts/` para `/opt/wedding`, crie `/opt/wedding/.env.production`
a partir do `.env.production.example` (permissão `600`) e preencha os segredos. Dê permissão de
execução aos scripts. Depois:

```bash
cd /opt/wedding && sudo ./scripts/deploy.sh <registro>/wedding-backend:<sha>
```

## Publicar o backend

No computador ou na CI:

```bash
cd backend && ./mvnw --batch-mode verify
docker buildx build --platform linux/arm64 -t <registro>/wedding-backend:<sha> --push .
```

A imagem precisa ser `linux/arm64` porque a `t4g` usa processador Graviton. Na instância, execute
`deploy.sh` com a nova imagem. Ele faz backup, sobe a versão nova, espera o health check e reverte
para a imagem anterior se falhar.

## Frontend

O build de produção do Angular usa `frontend/src/environments/environment.production.ts`, que aponta
para `https://api.casamentoduda.tobiaskiefer.com.br`. Frontend e API ficam no mesmo site
(`tobiaskiefer.com.br`), então o cookie de sessão `SameSite=Lax` e o CSRF continuam funcionando. O
backend precisa de `AUTH_ALLOWED_ORIGINS=https://casamentoduda.tobiaskiefer.com.br`.

Previews em `*.pages.dev` usam o mesmo build, mas pertencem a outro site e não conseguem autenticar na
API de produção. Eles servem apenas para revisão visual.

## Backup e restauração

- `backup.sh` roda por cron às 03:30 UTC, mantém 7 dias em `/opt/wedding/backups` e envia ao S3.
- Antes de cadastrar convidados reais, teste: `./scripts/restore.sh <dump>` restaura em um banco
  temporário, mostra contagens por tabela e o remove.
- `./scripts/restore.sh <dump> --replace-live` substitui o banco de produção após confirmação.
- RPO de 24 h (um dump por dia) e RTO de 4 h. Faça um backup manual antes de mudanças grandes.

## Monitoramento mínimo

- Configure um monitor externo gratuito (por exemplo UptimeRobot) em
  `https://api.casamentoduda.tobiaskiefer.com.br/api/public/pix`. O `/actuator` é bloqueado no proxy.
- Acompanhe o saldo de créditos em Billing semanalmente até o casamento.
- Logs: `docker compose logs --tail 200 api` (rotação de 3 × 10 MB por container).

## Limitações conhecidas

- A EC2 é ponto único de falha para API e banco.
- Os contadores de tentativas de login e RSVP ficam em memória e zeram a cada reinício da API.
- Atualizações do sistema operacional são manuais: `sudo dnf update -y` e reinício agendado fora do
  período de RSVP.
