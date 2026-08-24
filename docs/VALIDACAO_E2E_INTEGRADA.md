# Validação E2E integrada

Registro da suíte local da Issue #23. Diferentemente dos testes móveis rápidos, esta suíte não simula
a API: o navegador usa o frontend Angular, a API Spring Boot e um PostgreSQL real e descartável.

## Pré-requisitos

- Docker Desktop ou Docker Engine com Compose v2;
- Java 21;
- Node.js 24.15 e npm 11 ou 12;
- dependências do frontend instaladas com `npm ci`;
- Chromium do Playwright instalado com `npm run e2e:install`.

## Execução

Execute no diretório `frontend`:

```shell
npm run e2e:integrated
```

O comando executa o fluxo completo sem preparação manual:

1. cria um PostgreSQL temporário e aguarda o health check;
2. inicia o backend na porta `8081` e aplica as migrations Flyway;
3. cria uma conta administrativa exclusivamente local;
4. inicia o frontend na porta `4212`, encaminhando `/api` ao backend real;
5. executa os cenários críticos no Chromium;
6. encerra os processos e remove o banco temporário, mesmo quando um teste falha.

As portas e credenciais são deliberadamente exclusivas da suíte. O banco usa `tmpfs`, não reutiliza o
volume do desenvolvimento e é recriado vazio em toda execução.

## Cobertura

- login administrativo pelo navegador;
- ausência de edição administrativa de site ou conteúdo;
- criação de convidado, convite e link individual pela interface;
- acesso pelo código e resposta pública completa em `360 x 800` e em viewport desktop;
- persistência real de participante e acompanhante no PostgreSQL;
- consulta da resposta no dashboard administrativo;
- rejeição do excesso de acompanhantes pelo backend;
- repetição idempotente da mesma operação;
- código inválido sem exposição do segredo em `320 px` e sem rolagem horizontal;
- revogação imediata do acesso após inativar um convite.

Os cenários são sequenciais e criam dados próprios. A suíte rápida em `e2e/` continua responsável pela
cobertura visual mais ampla com respostas de API simuladas.

## Diagnóstico

Em caso de falha, consulte `frontend/test-results/playwright-integrated`. A configuração preserva
screenshot, vídeo e trace do cenário. No GitHub Actions, esses arquivos e o relatório HTML são enviados
como o artefato `integrated-e2e-diagnostics`.
