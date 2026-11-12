# ADR 0008 — Backend e PostgreSQL em uma EC2 única

- **Status:** Aceito
- **Data:** 2026-11-11
- **Decisor:** Tobias Felipe Kiefer
- **Substitui:** [ADR 0006](0006-hospedagem-inicial.md), exceto quanto ao frontend no Cloudflare Pages
- **Substituído por:** não se aplica

## Contexto

O ADR 0006 previa AWS App Runner e RDS PostgreSQL em `us-east-1`. Essa decisão deixou de ser
executável e deixou de ser proporcional ao uso:

- o App Runner não aceita novos clientes AWS e a AWS recomenda o ECS Express Mode como substituto;
- o ECS Express Mode mantém ao menos uma task Fargate e um balanceador, com custo fixo;
- o evento é pontual: casamento em 24/04/2027, cerca de 100 convidados em cerca de 50 grupos, com
  acessos esparsos e em dias distintos;
- a conta AWS será nova, com créditos temporários e plano gratuito de seis meses.

Foram avaliadas Lambda com Aurora Serverless v2 pausável e Lambda com RDS. Ambas exigem adaptar o
Spring Boot, limitar conexões, mover o rate limit de memória para armazenamento persistente e
executar o Flyway fora da inicialização. Aurora pausável ainda soma cold start da Lambda e retomada
do banco na primeira chamada de cada período ocioso. Para um evento único, esse risco não compensa a
economia.

## Opções consideradas

1. App Runner + RDS (ADR 0006): indisponível para contas novas e com custo fixo.
2. ECS Express Mode ou Fargate com balanceador: custo fixo desproporcional.
3. Lambda + Aurora PostgreSQL Serverless v2: menor custo, mas exige adaptação e tem latência de
   retomada.
4. Lambda + RDS provisionado: reduz o cold start do banco, mas mantém custo fixo.
5. Uma EC2 com Docker Compose, com a API e o PostgreSQL na mesma instância.

## Decisão

Adotar a opção 5:

- Angular estático no Cloudflare Pages, como no ADR 0006;
- uma instância EC2 `t4g.small` (2 GB de RAM) em `sa-east-1`, sempre ligada;
- Docker Compose com Spring Boot, PostgreSQL e proxy HTTPS (Caddy ou Nginx);
- PostgreSQL acessível apenas pela rede interna do Compose, sem porta pública;
- volume EBS gp3 de 20 GB criptografado;
- créditos de CPU no modo `standard`, para que a `t4g` nunca gere cobrança extra de CPU;
- backup diário com `pg_dump` para um bucket S3 privado, com expiração em 30 dias;
- acesso administrativo por AWS Systems Manager Session Manager, sem SSH nem par de chaves;
- somente as portas 443 (HTTPS) e 80 (emissão do certificado e redirecionamento) expostas no
  security group;
- imagens `linux/arm64` do backend publicadas no GHCR como pacote público (o repositório é público e
  a imagem não contém segredos), sem login na instância;
- segredos (senha do banco, pepper dos convites e senha do admin) gerados uma vez e guardados no
  AWS SSM Parameter Store padrão, preservados se a EC2 for recriada;
- infraestrutura em um template CloudFormation e deploy pelo GitHub Actions via OIDC, sem chaves
  AWS permanentes;
- Caddy emite o certificado Let's Encrypt; o registro DNS da API aponta direto para a EC2, sem proxy
  intermediário, para que o IP real do cliente chegue ao rate limit de login e RSVP;
- AWS Budgets sobre o uso bruto (antes dos créditos), com alertas a 50% e 80% e na previsão de 100%.

Não serão criados RDS, Aurora, NAT Gateway, balanceador, ECS, ElastiCache ou outros serviços com
custo fixo. `t4g.micro` só será considerada se testes de memória mostrarem folga.

A API ficará em `api.casamentodudatobi.tobiaskiefer.com.br`. O domínio é registrado no Registro.br e
o DNS fica no Cloudflare. O frontend (`casamentodudatobi.tobiaskiefer.com.br`) chama essa URL, definida no build de
produção do Angular. Os dois estão no mesmo site, então o cookie de sessão `SameSite=Lax` e o CSRF por
cabeçalho continuam válidos; basta liberar a origem do frontend no CORS. Um proxy `/api` no Cloudflare
foi descartado por acrescentar uma peça e esconder o IP do cliente do rate limit.
Operação detalhada em [PRODUCAO_EC2](../operations/PRODUCAO_EC2.md).

## Custos e créditos

Contas novas podem receber US$ 100 em créditos e obter até mais US$ 100, mas o plano gratuito termina
em seis meses ou quando os créditos acabam. Criada em novembro de 2026, a conta cobriria 24/04/2027
com pouca folga: o plano terminaria por volta de 4 de maio de 2027.

Estimativa de uso bruto em `sa-east-1`, com preços sob demanda da lista pública da AWS consultados
em 12/11/2026 (730 horas por mês):

| Item | `t4g.small` (2 GB) | `t4g.micro` (1 GB) |
|---|---:|---:|
| Instância (US$ 0,0268/h e US$ 0,0134/h) | US$ 19,56 | US$ 9,78 |
| IPv4 público (US$ 0,005/h) | US$ 3,65 | US$ 3,65 |
| gp3 20 GB (aproximado) | US$ 3,00 | US$ 3,00 |
| S3, logs e tráfego | < US$ 1 | < US$ 1 |
| **Por mês** | **~US$ 27** | **~US$ 17** |

O preço do disco é aproximado e não foi verificado se a franquia de disco e de IPv4 se aplica ao
plano Free atual; ambos foram contados como consumo. No ensaio local, a API usou 366–452 MB e o
PostgreSQL 53–61 MB. Padrão: `t4g.small`, pela folga de memória; `t4g.micro` é um parâmetro do
template. Com ~3,5 meses de operação, a `small` consome ~US$ 95 e a `micro` ~US$ 61.

## Consequências

### Positivas

- Menor mudança em relação ao backend que já passa nos testes com PostgreSQL real.
- Sem cold start nem retomada de banco para os convidados.
- Sem reescrita para Lambda e sem duplicar regras de negócio.
- API e dados em São Paulo, com menor latência e dados mantidos no Brasil.
- Custo previsível e sem serviços gerenciados com cobrança fixa.

### Negativas e trade-offs

- A EC2 é ponto único de falha para API e banco.
- Patches do sistema operacional, Docker, TLS e backups são responsabilidade do projeto.
- Banco e aplicação disputam 2 GB de RAM.
- O rate limit de login e de RSVP fica em memória e zera a cada reinício. É aceitável com uma única
  instância.
- Após o fim do plano gratuito ou dos créditos, o ambiente precisa ser migrado ou pago.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Falha ou perda da instância | Backup diário no S3, restauração testada antes de cadastrar convidados reais e AMI/IaC para recriar |
| Falta de memória | Limites de memória nos containers, monitoramento e teste de carga leve |
| Créditos acabarem antes do evento | Alertas, estimativa prévia e acompanhamento do consumo real durante a homologação |
| Conta Free ser encerrada | Migrar para o Paid plan antes do evento, se necessário |
| Banco exposto por engano | Sem porta publicada, security group restrito e verificação no deploy |
| Segredos no Git | Valores reais apenas na EC2 ou em AWS SSM Parameter Store |
| Deploy sem retorno | Imagem por SHA do commit, health check e rollback para a imagem anterior |

## Estratégia de saída

- O frontend continua estático e portável.
- O backend é uma imagem OCI e pode migrar para ECS, Lambda, outra VM ou outro provedor.
- O banco é PostgreSQL padrão com Flyway; a saída usa `pg_dump` e `pg_restore`.
- A infraestrutura deve ficar versionada no repositório para permitir reconstrução reproduzível.

## Critérios de revisão

- O consumo real ameaçar os créditos antes do evento.
- A memória da instância se mostrar insuficiente.
- O projeto passar a atender vários casamentos ou exigir alta disponibilidade.
- Houver necessidade de substituir a EC2 por Lambda, ECS ou outro serviço gerenciado.

## Referências

- [ADR 0006](0006-hospedagem-inicial.md), substituído por este ADR.
- RNF-OPS-001 a RNF-OPS-007 e RNF-SEC-001, RNF-SEC-007 e RNF-SEC-009.
- [AWS Free Tier](https://aws.amazon.com/free/free-tier-faqs/).
- [Como funcionam os planos AWS](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html).
- [Elegibilidade de instâncias EC2 no Free Tier](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html).
- [Preços do Amazon EBS](https://aws.amazon.com/ebs/pricing/).
- [AWS Systems Manager Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html).
