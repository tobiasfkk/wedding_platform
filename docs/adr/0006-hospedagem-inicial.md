# ADR 0006 — Cloudflare Pages e serviços gerenciados na AWS

- **Status:** Aceito
- **Data:** 2026-08-03
- **Decisor:** Tobias Felipe Kiefer
- **Substitui:** não se aplica
- **Substituído por:** não se aplica

## Contexto

A primeira produção deve exigir pouca operação, suportar crescimento moderado e permitir migração sem
reescrever o domínio. A conta AWS nova pode oferecer créditos temporários, mas a solução precisa ser
avaliada pelo custo normal após os créditos. Os usuários estarão majoritariamente no Brasil.

## Opções consideradas

1. Angular no Cloudflare Pages; API no AWS App Runner; PostgreSQL no RDS; imagens no S3.
2. Toda a aplicação em uma máquina virtual com Docker Compose.
3. ECS/Fargate com balanceador desde o início.
4. Plataformas externas com banco e backend serverless.

## Decisão

Adotar inicialmente:

- Angular estático no Cloudflare Pages Free, com domínio próprio e previews por Pull Request;
- imagem OCI do Spring Boot no ECR e execução no App Runner com 1 vCPU/2 GB, no máximo três instâncias;
- PostgreSQL no RDS `db.t4g.micro`, Single-AZ, 20 GB GP3, backups diários criptografados e retenção de
  sete dias;
- imagens em bucket S3 privado, criptografado, versionado e servido por URLs assinadas ou CloudFront
  com origem privada;
- credenciais do banco e `pepper` no AWS Secrets Manager;
- AWS Budgets e alertas em US$ 10, US$ 25 e US$ 40 de gasto mensal.

App Runner, RDS, ECR, S3 e segredos ficarão em `us-east-1`. O App Runner acessará o RDS privado por VPC
Connector; acesso ao S3 usará endpoint de VPC quando aplicável, evitando NAT Gateway no desenho
inicial. A API e o frontend usarão subdomínios do mesmo domínio registrável.

`us-east-1` foi escolhido porque App Runner não está disponível em `sa-east-1` e porque a faixa de
preço é menor. Latência Brasil–Virgínia e transferência internacional de dados deverão ser medidas e
submetidas à revisão de privacidade/LGPD antes de dados reais. Falha nesses critérios exige migrar a
API e o banco juntos para uma plataforma disponível em São Paulo.

## Estimativa mensal após créditos

Estimativa em dólares, consultada em 2026-08-03 para 730 horas/mês, tráfego baixo e `us-east-1`:

| Componente | Premissa | Estimativa mensal |
|---|---|---:|
| Cloudflare Pages | Site estático no plano Free | US$ 0 |
| App Runner | 2 GB provisionados: `2 × 730 × US$ 0,007`, mais CPU ativa baixa | US$ 11–15 |
| RDS PostgreSQL | `db.t4g.micro`: `730 × US$ 0,016`; GP3: `20 × US$ 0,115` | US$ 13,98 |
| S3 | Até 5 GB, poucas operações e baixo tráfego | US$ 0,15–1 |
| Secrets Manager | Três segredos a US$ 0,40 | US$ 1,20 |
| ECR, CloudWatch e transferência | Imagem pequena, logs limitados e margem de tráfego | US$ 2–10 |
| **Total esperado** | Sem domínio, impostos ou picos | **US$ 28–40/mês** |

Os créditos da AWS não entram na estimativa. Contas novas podem receber US$ 100 e obter até mais
US$ 100, mas o plano gratuito termina em seis meses ou quando os créditos acabam. Antes do deploy será
gerada uma estimativa no AWS Pricing Calculator; alertas financeiros e limites técnicos de capacidade
reduzirão o risco de gasto inesperado.

## Capacidade e evolução

- O Pages Free permite 500 builds/mês, 20.000 arquivos, ativos de até 25 MiB e tráfego estático sem
  cobrança; o projeto está muito abaixo desses limites.
- App Runner escala instâncias ativas horizontalmente. Limite inicial de três contém custo; CPU,
  memória, latência e erros determinarão ajustes.
- RDS Single-AZ é o primeiro gargalo e não possui failover automático. Antes de uso comercial ou de
  um evento cuja indisponibilidade seja crítica, avaliar Multi-AZ e teste de restauração.
- RPO inicial é 24 horas e RTO é 4 horas. Restauração será testada ao menos antes de cada lançamento.
- Imagens crescem independentemente no S3; lifecycle removerá versões antigas conforme a política de
  retenção.

## Estratégia de saída e migração

- O frontend é um conjunto de arquivos estáticos e pode migrar para S3/CloudFront, outro CDN ou host
  de site estático sem mudar o Angular.
- O backend é uma imagem OCI sem dependência de App Runner no domínio e pode migrar para ECS,
  Kubernetes, máquina virtual ou outro provedor.
- O banco usa PostgreSQL padrão e Flyway. Saída usa `pg_dump`/`pg_restore`, validação de contagem e
  janela de dupla escrita somente se o downtime aceitável não for suficiente.
- O acesso a objetos ficará atrás de uma porta da aplicação. Objetos S3 podem ser exportados com
  checksum e manifesto para armazenamento compatível.
- Infraestrutura deverá ser codificada antes da primeira produção para permitir reconstrução e
  rollback reproduzíveis.

## Consequências

### Positivas

- Frontend global sem custo fixo e backend com deploy e TLS gerenciados.
- Banco e objetos usam serviços maduros, backup e criptografia gerenciáveis.
- Tecnologias portáveis — arquivos estáticos, OCI, PostgreSQL e API S3 — reduzem lock-in.

### Negativas e trade-offs

- Existe custo fixo aproximado de US$ 25 antes de tráfego relevante.
- Single-AZ e uma instância provisionada não entregam alta disponibilidade plena.
- Região nos EUA aumenta latência e exige avaliação de transferência internacional de dados.
- VPC, permissões e observabilidade ainda exigem configuração cuidadosa.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Créditos terminarem sem aviso | Estimar custo normal, AWS Budgets e alertas em três faixas |
| Conta Free ser encerrada | Plano de upgrade antes de dados reais e exportações periódicas |
| Indisponibilidade do RDS Single-AZ | Backup diário, restauração testada e gatilho explícito para Multi-AZ |
| Latência para o Brasil | Medir p95 em homologação; migrar API e banco juntos se necessário |
| Transferência internacional inadequada | Minimização, criptografia, registro da base legal e revisão jurídica/LGPD |
| Exposição de imagens | Bucket privado, bloqueio de acesso público e URLs/ CDN assinadas |
| Lock-in | OCI, PostgreSQL padrão, Flyway, adaptador de objetos e infraestrutura como código |

## Critérios de revisão

- Custo mensal previsto ou real ultrapassar US$ 40 por dois meses.
- P95 de rede prejudicar as metas de experiência no Brasil.
- O evento exigir disponibilidade maior que o desenho Single-AZ oferece.
- Requisitos jurídicos exigirem residência de dados no Brasil.
- App Runner, RDS ou Cloudflare atingirem limites relevantes.

## Referências

- RNF-OPS-001 a RNF-OPS-007 e RNF-SEC-001, RNF-SEC-007 e RNF-SEC-009.
- [Limites do Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/).
- [Preço do Cloudflare Pages](https://developers.cloudflare.com/pages/functions/pricing/).
- [Preço do AWS App Runner](https://aws.amazon.com/apprunner/pricing/).
- [Regiões do AWS App Runner](https://docs.aws.amazon.com/general/latest/gr/apprunner.html).
- [Preço do RDS PostgreSQL](https://aws.amazon.com/rds/postgresql/pricing/).
- [Catálogo oficial do RDS em us-east-1](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/us-east-1/index.json), SKUs consultados em 2026-08-03.
- [Preço do S3](https://aws.amazon.com/s3/pricing/).
- [Preço do Secrets Manager](https://aws.amazon.com/secrets-manager/pricing/).
- [AWS Free Tier](https://aws.amazon.com/free/free-tier-faqs/).
