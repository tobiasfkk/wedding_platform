# Frontend

Aplicação Angular da Wedding Platform para o site público, o fluxo de RSVP e a área
administrativa.

## Requisitos

- Node.js 24.15 ou uma versão compatível da linha 24;
- npm 11 ou 12.

## Instalação

```bash
npm ci
```

## Desenvolvimento

```bash
npm start
```

A aplicação estará disponível em `http://localhost:4200/`.

Rotas iniciais:

- `/`: site público e página de verificação;
- `/rsvp`: confirmação de presença;
- `/admin`: área administrativa.

As três áreas usam carregamento lazy e componentes standalone. Nesta fundação elas exibem apenas
o estado inicial; as funcionalidades serão implementadas verticalmente nas issues correspondentes.

## Qualidade

```bash
npm test -- --watch=false
npm run build
npm run format:check
```

Para aplicar a formatação configurada pelo projeto:

```bash
npm run format
```

Os testes unitários usam Vitest, conforme o padrão de novos projetos Angular 22. O
[ADR 0005](../docs/adr/0005-interface-e-testes-e2e.md) define Angular Material/CDK como base visual
e Playwright para os fluxos E2E, que serão introduzidos junto aos fluxos críticos do MVP.

## Estrutura

```text
src/app/
├── features/
│   ├── admin/
│   ├── public-site/
│   └── rsvp/
├── app.config.ts
├── app.routes.ts
└── app.ts
```

Código compartilhado deve entrar em `shared` somente quando existir reutilização concreta; serviços
globais e integrações transversais poderão entrar em `core` quando forem necessários.
