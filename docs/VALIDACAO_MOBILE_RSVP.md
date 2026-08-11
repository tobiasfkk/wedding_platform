# Validação móvel do RSVP

Registro da revisão da Issue #36. O fluxo deve continuar funcional sem rolagem horizontal a partir
de 320 px, com controles confortáveis para toque, foco previsível e mensagens que não dependam
somente de cor.

## Cobertura automatizada

Execute no diretório `frontend`:

```shell
npm run e2e:install
npm run e2e:mobile
```

A suíte usa Chromium real e APIs simuladas para validar de forma determinística:

- fluxo completo nas larguras 320, 360, 390 e 430 px;
- ausência de rolagem horizontal;
- alvos interativos com pelo menos 44 px de altura;
- edição pelo teclado virtual e bloqueio de acompanhante vazio;
- foco ao adicionar ou remover acompanhantes e após salvar;
- convite inativo e código inválido;
- screenshots, vídeo e trace quando houver falha.

## Checklist manual

- [ ] Android: concluir uma resposta usando Chrome e teclado virtual.
- [ ] iPhone: concluir uma resposta usando Safari e teclado virtual.
- [ ] Confirmar que zoom de texto do sistema não corta conteúdo essencial.
- [ ] Alternar orientação durante a edição de um acompanhante.
- [ ] Conferir carregamento, código inválido, convite inativo, erro ao salvar e sucesso.
- [x] Executar Lighthouse móvel e registrar Performance maior ou igual a 80.

## Resultado desta revisão

- Playwright: cenários aprovados em Chromium, incluindo 320, 360, 390 e 430 px.
- Lighthouse móvel: **97 em Performance**, executado contra o build de produção local em
  04/08/2026.
- Android físico: pendente de validação pelo responsável.
- iPhone físico: pendente de validação pelo responsável.

Os testes automatizados reduzem regressões, mas não substituem a verificação do teclado, das áreas
seguras e do comportamento de rolagem em dispositivos físicos. A indisponibilidade de um dos
dispositivos deve ser registrada no PR, sem afirmar que houve validação real.
