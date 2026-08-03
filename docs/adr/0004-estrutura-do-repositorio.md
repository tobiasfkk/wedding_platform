# ADR 0004 — Monorepo para aplicação e infraestrutura

- **Status:** Aceito
- **Data:** 2026-08-03
- **Decisor:** Tobias Felipe Kiefer
- **Substitui:** não se aplica
- **Substituído por:** não se aplica

## Contexto

Backend, frontend, documentação e infraestrutura evoluem juntos e são mantidos inicialmente pela
mesma pessoa. Alterações verticais frequentemente atravessam mais de uma dessas áreas.

## Opções consideradas

1. Um monorepo com diretórios e pipelines independentes.
2. Repositórios separados por aplicação.
3. Repositório único sem limites explícitos.

## Decisão

Manter `backend`, `frontend`, `infrastructure` e `docs` no mesmo repositório. Cada área terá comandos,
dependências e documentação próprios. O workflow de CI continuará separando os jobs para que falhas
e tempos permaneçam visíveis.

Mudanças compartilhadas serão coordenadas por um único Pull Request. Artefatos gerados e segredos não
serão versionados. A estrutura não implica acoplamento de runtime nem impede deploys independentes.

## Consequências

### Positivas

- Mudanças verticais e contratos ficam atômicos e rastreáveis.
- Convenções, Issues e documentação permanecem centralizadas.
- Não há custo de sincronizar versões entre repositórios no MVP.

### Negativas e trade-offs

- O clone e a pipeline podem crescer com o produto.
- Permissões de acesso são aplicadas ao repositório inteiro.
- Requer filtros e caches para manter a CI eficiente no futuro.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Pipeline lenta | Jobs paralelos, cache por lockfile e futuros filtros sem bloquear checks obrigatórios |
| Acoplamento acidental | Builds independentes e contratos explícitos |
| Segredos de múltiplos ambientes | Secret manager e princípio de menor privilégio por workflow |

## Critérios de revisão

- Equipes ou políticas de acesso diferentes precisarem de isolamento.
- O tamanho do repositório comprometer clone, CI ou histórico.
- Componentes adquirirem ciclos de release realmente independentes.

## Referências

- Estrutura descrita no README do repositório.
- RNF-MNT-003 e RNF-MNT-004.
