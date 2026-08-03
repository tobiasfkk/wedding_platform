# ADR 0005 — Angular Material e Playwright

- **Status:** Aceito
- **Data:** 2026-08-03
- **Decisor:** Tobias Felipe Kiefer
- **Substitui:** não se aplica
- **Substituído por:** não se aplica

## Contexto

O projeto precisa de componentes acessíveis e consistentes sem transformar a fundação em um projeto
de design system. Também precisa validar login, criação de convite e RSVP nos navegadores do escopo.

## Opções consideradas

### Interface

1. Angular Material e CDK com tema próprio.
2. Biblioteca de componentes de terceiros mais abrangente.
3. Componentes inteiramente próprios.

### Testes ponta a ponta

1. Playwright.
2. Cypress.
3. WebDriver/Selenium configurado manualmente.

## Decisão

Adotar Angular Material e CDK como base de comportamento, acessibilidade e componentes de formulário.
A identidade visual continuará própria por tema e design tokens; componentes Material não serão usados
quando HTML semântico e CSS simples forem suficientes.

Adotar Playwright para testes E2E. A suíte começará pelos fluxos críticos e rodará Chromium na validação
rápida de cada PR. Chromium, Firefox e WebKit serão executados antes de releases e em agenda periódica.
Falhas deverão preservar trace, screenshot e vídeo quando úteis.

## Consequências

### Positivas

- Integração e atualização acompanham o ecossistema oficial do Angular.
- Componentes complexos começam com comportamento de teclado e acessibilidade conhecidos.
- Playwright cobre Chromium, Firefox e WebKit com uma única API.

### Negativas e trade-offs

- Material influencia markup, bundle e aparência se o tema não for bem controlado.
- Browsers do Playwright aumentam download e tempo da pipeline.
- Testes E2E ainda exigem dados isolados e ambiente previsível.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Interface genérica | Tema próprio, tokens e revisão visual por fluxo |
| Regressão de acessibilidade | axe/Lighthouse, testes de teclado e revisão manual |
| E2E instável | Seletores por papel/label, dados isolados e espera por estado observável |
| Pipeline lenta | Chromium por PR; matriz completa em release ou agenda |

## Critérios de revisão

- A biblioteca impedir requisitos visuais ou de acessibilidade relevantes.
- O custo de bundle exceder os budgets definidos.
- A estratégia E2E não cobrir um navegador obrigatório de forma confiável.

## Referências

- RNF-QLT-003, RNF-QLT-005, RNF-QLT-006 e RNF-QLT-007.
- [Angular Material](https://material.angular.dev/).
- [Browsers suportados pelo Playwright](https://playwright.dev/docs/browsers).
