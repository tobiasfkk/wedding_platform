# Site público e conteúdo

## Decisão atual

O site do casamento separa três responsabilidades:

1. **conteúdo:** textos, agenda e referências de mídia;
2. **estrutura:** hero, história, agenda, avisos e chamada para RSVP;
3. **tema:** cores, tipografia, espaçamento e movimento.

O renderizador mobile-first recebe um contrato tipado e é compartilhado pela página pública e pela
prévia administrativa. O conteúdo inicial serve apenas como modelo para um casamento ainda sem
rascunho; visitantes nunca recebem essa versão automaticamente.

## Fluxo administrativo

Em `/admin/site`, o administrador pode editar abertura, história, cerimônia, recepção, avisos e
chamada para RSVP. Também pode adicionar até 10 fotos, escolher onde cada uma aparece, ajustar o
ponto focal, alterar a ordem das fotos e das seções, visualizar a prévia, salvar o rascunho e
publicar ou despublicar explicitamente.

Rascunho e publicação possuem versões independentes. Salvar não altera o site dos convidados; ao
publicar, o backend copia uma versão consistente do rascunho. Alterações posteriores continuam
privadas até a próxima publicação. Ao despublicar, o rascunho é preservado e o endpoint visitante
volta a responder como indisponível.

O controle de versão do rascunho rejeita uma gravação baseada em uma versão antiga, evitando que
duas abas sobrescrevam alterações silenciosamente.

## Locais e mapas

O conteúdo publicável define explicitamente se cerimônia e recepção compartilham um local ou usam
locais separados. Cada momento pode ser ocultado, mas ao menos um deve permanecer visível e conter
nome do local e endereço. Conteúdos anteriores a essa opção continuam sendo interpretados como dois
locais separados e visíveis.

O campo geral de localização do casamento serve somente para preencher o primeiro rascunho. Depois
disso, nome, endereço, visibilidade e link do mapa seguem o mesmo versionamento dos demais conteúdos:
salvar altera o rascunho e publicar atualiza o que os convidados veem.

Links de mapa são opcionais e aceitam apenas HTTPS em endereços conhecidos do Google Maps. A página
pública abre o destino em nova aba com isolamento da página de origem. No modo compartilhado, os
horários de cerimônia e recepção continuam distintos, mas nome, endereço e ação de mapa aparecem uma
única vez.

## Imagens locais

Fotos serão representadas por metadados com origem, texto alternativo e dimensões. O contrato não
depende de um provedor específico: arquivos locais podem ser usados durante o desenvolvimento e um
armazenamento de objetos poderá ser conectado apenas na etapa de lançamento.

Por padrão, os arquivos ficam em `.local-data/media` (fora do Git). O diretório pode ser alterado
pela variável `MEDIA_LOCAL_DIRECTORY`. JPG e PNG são aceitos, com limite de 5 MB e 6000 pixels por
dimensão.

Uma imagem de rascunho só pode ser lida pela rota administrativa autenticada. A rota pública de
mídia passa a servi-la apenas quando a versão que a referencia é publicada. O renderizador solicita
larguras de 480, 768, 1280 ou 1920 pixels conforme a tela; o backend reduz a imagem localmente sem
alterar o arquivo original.

Uma foto pode ocupar o fundo da abertura. As demais são associadas à história, agenda, avisos ou
RSVP e aparecem em capítulos de tela cheia durante a rolagem. A ordem é controlada pelo conteúdo,
e o mesmo resultado é usado na prévia administrativa e na página pública.

## Limites desta etapa

- Não existe edição livre de HTML, CSS ou JavaScript.
- As seções suportadas possuem estrutura estável e acessível.
- O construtor visual amplo permanece como estudo futuro na issue #49.
- Não existe recorte destrutivo: o ponto focal controla o enquadramento responsivo e preserva o
  arquivo original.
