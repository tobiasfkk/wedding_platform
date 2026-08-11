# ADR 0007 — Sites personalizados implementados em código

- **Status:** Aceito
- **Data:** 2026-08-11
- **Decisor:** Tobias Felipe Kiefer
- **Substitui:** direção de personalização administrativa das issues #43, #48, #49, #53 e #55; decisão de armazenamento de imagens do site no ADR 0006
- **Substituído por:** não se aplica

## Contexto

O produto foi inicialmente modelado para permitir que o administrador alterasse conteúdo, imagens,
ordem de seções e, futuramente, temas ou a própria composição da página. Essa direção exigia um
editor, contratos genéricos, prévia, versionamento de rascunho e publicação, armazenamento de mídia e
um renderizador orientado por configuração.

O modelo comercial e de entrega mudou. O diferencial desejado é um projeto visual exclusivo para
cada casamento, construído por um desenvolvedor frontend a partir do design escolhido pelo cliente.
Manter simultaneamente um construtor configurável aumentaria complexidade, limitaria a liberdade
criativa e sustentaria capacidades que não fazem parte do produto.

## Opções consideradas

1. Manter o editor e adicionar temas configuráveis.
2. Manter apenas um CMS de conteúdo com layout fixo.
3. Implementar cada site diretamente no frontend e limitar a administração a convidados, convites e RSVP.

## Decisão

Adotar a opção 3. Cada instalação possui uma página pública específica, implementada em Angular,
HTML e SCSS. Conteúdo editorial, imagens e design são ativos versionados do frontend. A publicação
acontece pelo pipeline de código após revisão, não por uma ação na área administrativa.

O backend não oferece endpoints nem persistência para páginas, seções, temas, rascunhos, versões
publicadas, imagens ou dados descritivos do casamento. A área administrativa mantém apenas convidados,
convites e RSVP, incluindo o prazo operacional para confirmação.

Nome do casal, data, horário, local e demais informações do evento existem somente no frontend. O
banco mantém um identificador técnico criado automaticamente para relacionar convidados e convites e
o prazo do RSVP. Esse prazo é configurado no dashboard de confirmações e não controla conteúdo do site.

As migrações já aplicadas permanecem imutáveis. Migrations posteriores removem as tabelas e colunas
obsoletas e criam o contexto técnico da instalação, preservando a compatibilidade com bancos locais
existentes e evitando escritas durante consultas.

## Consequências

### Positivas

- liberdade completa para criar uma identidade visual por casamento;
- frontend público menor, sem carregamento de conteúdo editorial pela API;
- backend e banco deixam de manter um domínio que não entrega valor;
- revisão, teste e histórico de mudanças ficam concentrados no Git;
- menor superfície administrativa e de segurança.

### Negativas e trade-offs

- o cliente não altera conteúdo ou design sozinho;
- toda mudança editorial exige trabalho e publicação do desenvolvedor;
- reutilização entre casamentos deve ser deliberada, sem recriar um construtor implícito;
- ativos do site aumentam o artefato estático e precisam de otimização no build ou antes do commit.

## Regras de implementação

- não criar DTO ou schema genérico para controlar a composição pública;
- não expor edição administrativa de conteúdo editorial, mídia ou aparência;
- somente dados de convidados, convites e RSVP podem vir da API;
- imagens públicas pertencem ao frontend e são servidas pelo host estático/CDN;
- cada nova experiência deve manter os requisitos de acessibilidade, responsividade e desempenho.

## Critérios de revisão

Esta decisão só deve ser revista se evidências comerciais demonstrarem que a autonomia de edição é
essencial e financia o custo de produto, segurança, acessibilidade e manutenção de um CMS. Uma futura
revisão exige novo ADR; não deve surgir gradualmente por abstrações genéricas no site público.

## Referências

- Issue #57.
- Issue #37.
- `docs/SITE_PUBLICO_E_CONTEUDO.md`.
