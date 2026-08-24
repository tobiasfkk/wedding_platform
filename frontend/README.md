# Frontend

Aplicação Angular da Wedding Platform para o site público, o fluxo de RSVP e a área
administrativa.

A área protegida oferece a gestão de convidados em `/admin/guests`, a criação, ativação e rotação
segura dos links em `/admin/invitations` e a administração das confirmações em `/admin/rsvp`.
O dashboard de RSVP também permite configurar a data e o horário-limite das confirmações públicas.

O site público é uma experiência mobile-first em página única, implementada diretamente em
`src/app/features/public-site`. Layout, textos, imagens e identidade visual são específicos do
casamento e versionados com o frontend. Não existe editor administrativo, contrato de seções ou
carregamento de conteúdo editorial pela API. A confirmação personalizada é incorporada ao final da
home; `/rsvp` permanece disponível somente para compatibilidade com links anteriores.

## Requisitos

- Node.js 24.15 ou uma versão compatível da linha 24;
- npm 11 ou 12.

Para a suíte E2E integrada também são necessários Java 21 e Docker com Compose v2.

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

- `/`: site público personalizado;
- `/#code=...`: site público e confirmação personalizada no mesmo fluxo;
- `/rsvp#code=...`: rota legada compatível com convites anteriores;
- `/admin/login`: autenticação administrativa;
- `/admin`: área administrativa protegida.

As áreas usam carregamento lazy e componentes standalone. O comando `npm start` encaminha chamadas
de `/api` para `http://localhost:8080`, preservando cookies e a proteção CSRF durante o desenvolvimento.
No acesso ao RSVP, o código é removido do fragmento antes da troca por uma sessão pública limitada;
links inválidos, antigos e inativos usam o mesmo estado de erro e não expõem participantes.

## Qualidade

```bash
npm test -- --watch=false
npm run e2e:install
npm run e2e:mobile
npm run e2e:integrated
npm run build
npm run format:check
```

Para aplicar a formatação configurada pelo projeto:

```bash
npm run format
```

Os testes unitários usam Vitest, conforme o padrão de novos projetos Angular 22. O RSVP também
possui uma suíte Playwright nas larguras móveis definidas em
[`docs/VALIDACAO_MOBILE_RSVP.md`](../docs/VALIDACAO_MOBILE_RSVP.md). O
[teste integrado](../docs/VALIDACAO_E2E_INTEGRADA.md) sobe frontend, API e PostgreSQL reais com um
único comando e cobre os fluxos críticos sem respostas simuladas. O
[ADR 0005](../docs/adr/0005-interface-e-testes-e2e.md) registra as decisões de interface e E2E.

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
