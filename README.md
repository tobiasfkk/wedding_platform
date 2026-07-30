# Wedding Platform

Plataforma web para centralizar informações de um casamento, administrar convidados e convites e receber confirmações de presença.

O projeto também é um estudo prático de engenharia de software: requisitos rastreáveis, arquitetura evolutiva, testes automatizados, segurança, observabilidade e entrega contínua serão introduzidos de forma incremental.

## Status

O produto está na **Fase 0 — Descoberta e fundação**. A especificação e os fluxos foram definidos; backend, frontend e infraestrutura ainda serão gerados nas próximas Issues.

## Documentação

- [Especificação do produto](docs/ESPECIFICACAO_DO_PROJETO.md)
- [Wireframes de baixa fidelidade](docs/WIREFRAMES_BAIXA_FIDELIDADE.md)
- [Índice da documentação](docs/README.md)
- [Como contribuir](CONTRIBUTING.md)

## Estrutura do repositório

```text
wedding_platform/
├── .github/          Templates e automações do GitHub
├── backend/          API e regras de negócio em Java/Spring Boot
├── docs/             Produto, arquitetura e operação
├── frontend/         Aplicação web Angular
├── infrastructure/   Ambiente local, proxy e implantação
├── .editorconfig     Convenções básicas de formatação
├── .gitattributes    Normalização de arquivos no Git
├── .gitignore        Artefatos que não devem ser versionados
├── CONTRIBUTING.md   Fluxo de trabalho e padrões do projeto
└── README.md         Visão geral e ponto de entrada
```

Cada diretório possui um README com seu propósito e o estado atual.

## Primeiros passos

Neste estágio, não existe aplicação executável. Para acompanhar ou contribuir:

1. Clone o repositório.
2. Leia a [especificação do produto](docs/ESPECIFICACAO_DO_PROJETO.md).
3. Consulte o [GitHub Project](https://github.com/users/tobiasfkk/projects/6) e escolha uma Issue em `Ready` sem dependências pendentes.
4. Siga as orientações de [contribuição](CONTRIBUTING.md).

Os comandos de execução do backend, frontend e ambiente Docker serão adicionados aos respectivos READMEs quando essas aplicações forem criadas.

## Arquitetura planejada

A solução começará como um **monólito modular**, com frontend e infraestrutura mantidos no mesmo repositório. Mensageria e microsserviços somente serão introduzidos quando houver um caso de uso e benefício mensurável.

Stack inicial planejada:

- Java 21 e Spring Boot;
- Angular e TypeScript;
- PostgreSQL e Flyway;
- Docker e Docker Compose;
- GitHub Actions;
- JUnit, Testcontainers e testes ponta a ponta.

As escolhas ainda pendentes devem ser registradas por ADR antes de se tornarem compromissos arquiteturais.

## Planejamento

O trabalho é rastreado por Issues e Milestones no GitHub. A rastreabilidade esperada é:

```text
Objetivo → Requisito/Regra → Issue → Pull Request → Teste → Release
```

Não mantenha um backlog paralelo em arquivos locais. A especificação registra o plano macro; o GitHub contém o trabalho executável.

## Segurança

Nunca versione senhas, tokens, chaves, certificados privados, dados reais de convidados ou arquivos `.env`. Use valores fictícios em exemplos e reporte vulnerabilidades diretamente ao responsável pelo repositório, sem abrir uma Issue pública com detalhes exploráveis.

