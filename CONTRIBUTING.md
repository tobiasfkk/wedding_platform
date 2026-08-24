# Contribuindo com a Wedding Platform

Este projeto é mantido inicialmente por uma pessoa, mas segue um fluxo explícito para preservar histórico, qualidade e rastreabilidade.

## 1. Antes de começar

1. Escolha uma Issue em `Ready`.
2. Confirme que as dependências estão concluídas.
3. Leia os requisitos e regras citados pela Issue.
4. Verifique se os critérios de aceite são testáveis e se o trabalho cabe em uma entrega curta.
5. Mova a Issue para `In progress` somente ao iniciar o trabalho.

Se o escopo mudar, atualize a Issue antes de implementar. Mudanças em regra de negócio também devem atualizar a especificação.

## 2. Branches

A branch `main` deve permanecer estável. Alterações entram por Pull Request.

Formato recomendado:

```text
<tipo>/<numero-da-issue>-<descricao-curta>
```

Tipos usuais:

- `feature`: funcionalidade;
- `fix`: correção;
- `chore`: fundação ou manutenção;
- `docs`: documentação;
- `test`: testes;
- `ci`: integração e entrega contínua;
- `refactor`: mudança interna sem alterar comportamento.

Exemplos:

```text
chore/4-repository-foundation
feature/13-manage-guests
fix/42-companion-limit
```

Branches criadas por agentes automatizados podem usar o prefixo `agent/`.

## 3. Commits

Use mensagens curtas no imperativo ou presente, seguindo o formato Conventional Commits:

```text
<tipo>(<escopo opcional>): <descrição>
```

Exemplos:

```text
feat(guest): add guest registration
fix(rsvp): enforce companion limit
test(invitation): cover expired access code
docs: describe local environment
```

Tipos aceitos: `feat`, `fix`, `docs`, `test`, `chore`, `ci`, `build`, `refactor` e `perf`.

Prefira commits coesos. Não misture formatação ampla, refatoração e funcionalidade sem necessidade.

## 4. Pull Requests

- Abra como draft enquanto o trabalho não estiver pronto para validação.
- Relacione a Issue com `Refs #123` durante o desenvolvimento.
- Use `Closes #123` somente quando o merge realmente concluir todos os critérios.
- Descreva o que mudou, por que mudou, impacto e verificações executadas.
- Revise o próprio diff antes de solicitar merge.
- Não faça merge com checks obrigatórios falhando.
- Use squash merge para manter uma alteração lógica por entrada na `main`, salvo quando preservar commits for relevante.
- Remova a branch após o merge.

Mesmo em trabalho individual, o PR funciona como ponto explícito de revisão e registro da decisão.

## 5. Issues

Uma Issue executável deve conter:

- objetivo e valor esperado;
- escopo e itens fora do escopo quando necessário;
- critérios de aceite verificáveis;
- dependências;
- referências a RFs, RNs e RNFs aplicáveis;
- prioridade, tamanho, milestone e responsável.

Evite Issues que descrevem apenas uma camada, como “criar tabela”, quando o resultado esperado é uma funcionalidade vertical.

## 6. Qualidade

Antes de publicar uma alteração:

1. Execute os testes relevantes.
2. Execute formatadores e análise estática disponíveis.
3. Verifique que não há segredo ou dado pessoal no diff.
4. Confirme migrações e compatibilidade quando houver banco de dados.
5. Atualize API, README, ADR ou especificação quando aplicável.

Execute as mesmas verificações usadas pela integração contínua antes de publicar:

```powershell
# backend/
.\mvnw.cmd --batch-mode --no-transfer-progress verify

# frontend/
npm ci
npm run check
npm test -- --watch=false
npm run e2e:mobile
npm run e2e:integrated
npm run build
```

No Linux ou macOS, use `./mvnw` no lugar de `.\mvnw.cmd`. O `verify` do backend também executa o
SpotBugs; o `check` do frontend valida os tipos TypeScript e a formatação. A suíte integrada requer
Docker e executa frontend, API e PostgreSQL reais conforme
[`docs/VALIDACAO_E2E_INTEGRADA.md`](docs/VALIDACAO_E2E_INTEGRADA.md).

## 7. Definition of Done

Uma alteração somente está concluída quando:

- critérios de aceite estão atendidos;
- testes relevantes existem e passam;
- revisão do diff foi realizada;
- documentação e contratos foram atualizados;
- erros, logs, segurança e dados pessoais foram considerados;
- alteração foi validada em ambiente adequado;
- PR foi integrado e a Issue foi movida para `Done`.

Consulte também a seção 13.4 da [especificação do produto](docs/ESPECIFICACAO_DO_PROJETO.md).

## 8. Segurança e dados

- Nunca inclua credenciais ou dados reais de convidados.
- Use `.env.example` apenas com nomes e valores fictícios.
- Não registre senhas, códigos de convite, restrições alimentares ou tokens em logs.
- Dependências novas devem ter propósito claro e origem confiável.
- Vulnerabilidades devem ser comunicadas de forma privada ao responsável.
