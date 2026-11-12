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
- volume EBS gp3 de 20 a 30 GB;
- backup diário com `pg_dump` para um bucket S3 privado, com retenção curta;
- acesso administrativo por AWS Systems Manager Session Manager, sem SSH aberto à internet;
- somente as portas 443 (HTTPS) e 80 (emissão do certificado e redirecionamento) expostas no
  security group;
- imagens do backend em um repositório ECR privado na mesma região, lidas pela role da instância;
- Caddy emite o certificado Let's Encrypt; o registro DNS da API aponta direto para a EC2, sem proxy
  intermediário, para que o IP real do cliente chegue ao rate limit de login e RSVP;
- AWS Budgets com alertas de consumo dos créditos em 50%, 80% e 95%.

Não serão criados RDS, Aurora, NAT Gateway, balanceador, ECS, ElastiCache ou outros serviços com
custo fixo. `t4g.micro` só será considerada se testes de memória mostrarem folga.

A API ficará em `api.casamentodudaetobias.tobiaskiefer.com.br`. O domínio e, hoje, o DNS ficam no
Registro.br. O frontend (`casamentodudaetobias.tobiaskiefer.com.br`) chama essa URL, definida no build de
produção do Angular. Os dois estão no mesmo site, então o cookie de sessão `SameSite=Lax` e o CSRF por
cabeçalho continuam válidos; basta liberar a origem do frontend no CORS. Um proxy `/api` no Cloudflare
foi descartado por acrescentar uma peça e esconder o IP do cliente do rate limit.
Operação detalhada em [PRODUCAO_EC2](../operations/PRODUCAO_EC2.md).

## Custos e créditos

Contas novas podem receber US$ 100 em créditos e obter até mais US$ 100, mas o plano gratuito termina
em seis meses ou quando os créditos acabam. Criada em novembro de 2026, a conta cobriria 24/04/2027
com pouca folga: o plano terminaria por volta de 4 de maio de 2027.

A estimativa em dólares para `t4g.small`, EBS, IPv4 público e S3 em `sa-east-1` deve ser gerada no AWS
Pricing Calculator antes de criar recursos reais. Ela não está registrada aqui porque ainda não foi
calculada. Se o consumo previsto não couber nos créditos, avaliar `us-east-1` ou `t4g.micro` antes de
cadastrar dados reais.

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
