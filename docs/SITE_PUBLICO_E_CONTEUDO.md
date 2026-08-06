# Site público e conteúdo

## Decisão atual

O site do casamento separa três responsabilidades:

1. **conteúdo:** textos, agenda e referências de mídia;
2. **estrutura:** hero, história, agenda, avisos e chamada para RSVP;
3. **tema:** cores, tipografia, espaçamento e movimento.

A primeira entrega usa conteúdo provisório tipado em
`frontend/src/app/features/public-site/public-site-content.ts`. Isso permite validar localmente o
renderizador mobile-first sem antecipar persistência, upload ou infraestrutura.

## Evolução administrativa

A issue #48 substituirá a constante local por uma versão publicada pelo administrador. A edição
terá rascunho e prévia, e o visitante continuará recebendo somente o conteúdo publicado. O mesmo
renderizador será usado na prévia e na página pública.

Fotos serão representadas por metadados com origem, texto alternativo e dimensões. O contrato não
depende de um provedor específico: arquivos locais podem ser usados durante o desenvolvimento e um
armazenamento de objetos poderá ser conectado apenas na etapa de lançamento.

## Limites desta etapa

- Não existe edição livre de HTML, CSS ou JavaScript.
- As seções suportadas possuem estrutura estável e acessível.
- O construtor visual amplo permanece como estudo futuro na issue #49.
- Até a #48, textos e fotos reais não são cadastrados pela interface administrativa.
