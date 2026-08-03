# Architecture Decision Records

Este diretório registra decisões arquiteturais significativas da Wedding Platform.

## Convenção

- O número do ADR é estável e nunca é reutilizado.
- Novas decisões começam como `Proposto` e passam a `Aceito` quando aprovadas.
- Uma decisão alterada não é apagada: um novo ADR a substitui e ambos registram o vínculo.
- Correções editoriais não mudam o status; mudanças de decisão exigem novo ADR.

Status possíveis: `Proposto`, `Aceito`, `Rejeitado`, `Substituído` e `Obsoleto`.

## Índice

| ADR | Decisão | Status |
|---|---|---|
| [0001](0001-monolito-modular.md) | Monólito modular e limites iniciais | Aceito |
| [0002](0002-autenticacao-administrativa.md) | Autenticação e autorização administrativa | Aceito |
| [0003](0003-codigo-de-convite.md) | Geração, armazenamento e rotação do código de convite | Aceito |
| [0004](0004-estrutura-do-repositorio.md) | Monorepo para aplicação e infraestrutura | Aceito |
| [0005](0005-interface-e-testes-e2e.md) | Angular Material e Playwright | Aceito |
| [0006](0006-hospedagem-inicial.md) | Cloudflare Pages e serviços gerenciados na AWS | Aceito |

Use o [template](0000-template.md) para novas decisões.
