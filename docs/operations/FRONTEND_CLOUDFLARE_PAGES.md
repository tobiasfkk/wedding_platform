# Frontend no Cloudflare Pages

O frontend Angular usa o projeto `wedding-platform` no Cloudflare Pages. Durante a preparação do
lançamento, apenas previews explícitos são publicados. O domínio público e o deploy automático de
produção permanecem desativados até frontend, API e PostgreSQL passarem juntos pela validação da
issue #27.

## Endereços planejados

- preview inicial: `initial-preview.wedding-platform-24v.pages.dev`;
- produção planejada: `casamentodudatobi.tobiaskiefer.com.br`;
- o DNS do domínio próprio não deve ser alterado antes da validação integrada publicada.

## Configuração versionada

O arquivo `frontend/wrangler.jsonc` é a fonte de verdade da configuração do Pages. O diretório
publicado é `frontend/dist/wedding-frontend/browser`.

O workflow `Deploy frontend preview` é manual para impedir uma publicação de produção acidental.
Antes de executá-lo, o repositório precisa destes secrets:

- `CLOUDFLARE_ACCOUNT_ID`;
- `CLOUDFLARE_API_TOKEN`, limitado à permissão `Account / Cloudflare Pages / Edit` na conta usada
  pelo projeto.

O token deve ser criado no painel da Cloudflare e salvo diretamente em GitHub > Settings > Secrets
and variables > Actions. Ele nunca deve ser colocado em arquivo, log, comentário ou mensagem.

## Publicar um preview pelo GitHub

1. Abra Actions > Deploy frontend preview.
2. Selecione Run workflow.
3. Informe um alias simples, por exemplo `review-home`.
4. Aguarde as verificações e o build terminarem.
5. Abra a URL informada pelo Wrangler no log do passo de deploy.

## Validação atual

O preview estático valida HTTPS, ativos e rotas do Angular. As requisições relativas a `/api` ainda
não representam uma API publicada e podem receber o fallback HTML do Pages. RSVP, Pix dinâmico e a
administração só poderão ser validados após a publicação do backend e do proxy de mesma origem.

## Próximas etapas

1. Provisionar o backend e o PostgreSQL conforme [PRODUCAO_EC2](PRODUCAO_EC2.md).
2. ~~Encaminhamento de `/api`~~: substituído pela URL da API em `api.casamentodudatobi.tobiaskiefer.com.br`
   no build de produção ([ADR 0008](../adr/0008-hospedagem-ec2-unica.md)).
3. Executar a suíte E2E integrada no ambiente publicado.
4. Configurar o subdomínio próprio e validar TLS.
5. Só então habilitar o workflow de produção após a CI da branch `main`.
