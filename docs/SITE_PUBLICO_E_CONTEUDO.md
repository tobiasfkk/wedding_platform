# Site público personalizado

## Decisão atual

Cada casamento possui uma experiência pública única, desenhada e implementada diretamente no
frontend. Layout, conteúdo editorial, imagens, identidade visual, ordem das seções e animações são
parte do código versionado do casamento e passam pelo mesmo fluxo de revisão, testes e publicação da
aplicação.

Não existe CMS, editor visual, tema selecionável, prévia administrativa ou API de publicação de
conteúdo. O administrador gerencia somente convidados, convites e RSVP.

## Responsabilidades

### Desenvolvedor frontend

- receber briefing, conteúdo e referências aprovadas pelo cliente;
- implementar a composição específica em Angular, HTML e SCSS;
- adicionar imagens otimizadas aos ativos versionados do frontend;
- integrar as chamadas para RSVP sem acoplar o design à API;
- validar responsividade, acessibilidade, desempenho e movimento reduzido;
- publicar mudanças pelo fluxo de entrega do repositório.

### Backend

O backend não conhece seções, temas, textos editoriais, imagens, versões ou dados descritivos do
evento. Ele permanece responsável por autenticação, convidados, convites e RSVP.

### Administrador

O administrador não altera a apresentação pública. Mudanças no design ou conteúdo editorial são
solicitadas ao desenvolvedor e entregues como uma nova versão do frontend.

## Estrutura recomendada

A página específica fica em `frontend/src/app/features/public-site`. Imagens do casamento devem ser
armazenadas sob `frontend/public`, com nomes descritivos e versões adequadas às larguras utilizadas.
Não crie schemas genéricos, DTOs de página ou abstrações configuráveis sem uma nova decisão
arquitetural.

## Critérios permanentes

- experiência utilizável a partir de 320 px;
- navegação por teclado, foco visível, semântica e contraste adequados;
- conteúdo compreensível com JavaScript de animação indisponível;
- respeito a `prefers-reduced-motion`;
- imagens com dimensões declaradas, formatos eficientes e carregamento apropriado;
- nenhuma dependência de API para renderizar conteúdo editorial.

Esta decisão está registrada no [ADR 0007](adr/0007-sites-personalizados-em-codigo.md) e na issue
[#57](https://github.com/tobiasfkk/wedding_platform/issues/57).
