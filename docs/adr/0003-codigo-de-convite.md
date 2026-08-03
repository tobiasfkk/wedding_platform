# ADR 0003 — Geração, armazenamento e rotação do código de convite

- **Status:** Aceito
- **Data:** 2026-08-03
- **Decisor:** Tobias Felipe Kiefer
- **Substitui:** não se aplica
- **Substituído por:** não se aplica

## Contexto

O link de convite funciona como uma credencial limitada ao grupo convidado. Códigos previsíveis,
registrados em texto puro ou mantidos na URL podem permitir enumeração ou vazamento por logs,
histórico e cabeçalhos de referência.

## Opções consideradas

1. Identificador UUID armazenado em texto puro.
2. Token aleatório armazenado de forma reversível.
3. Token aleatório de alta entropia, armazenado somente como resumo autenticado.

## Decisão

Cada ativação ou rotação produzirá 32 bytes por um CSPRNG e os codificará em Base64 URL-safe sem
padding. O valor público terá aproximadamente 256 bits de entropia e não conterá identificadores de
negócio.

O banco armazenará somente `HMAC-SHA-256(pepper, token)`, a versão não secreta do `pepper` e uma
restrição de unicidade. O `pepper` será um segredo versionado fora do banco. O token original será
exibido uma única vez ao administrador; se for perdido, deverá ser regenerado.

O link usará fragmento, por exemplo `https://site.example/rsvp#code=<token>`, para que o token não seja
enviado ao servidor web ou CDN na URL. O Angular enviará o token uma única vez no corpo de uma
requisição HTTPS, receberá uma sessão pública limitada ao convite e removerá imediatamente o
fragmento do histórico.

A rotação ocorrerá em uma única transação: cria o novo resumo, revoga o anterior e registra data e
autor. Resumos revogados serão mantidos para auditoria, mas nunca voltarão a autenticar. A validade
também respeitará estado do convite e data-limite configurada.

Durante a rotação do `pepper`, a aplicação calculará o HMAC com as versões ativa e anterior e buscará
ambos os resumos. Convites ainda associados à versão anterior serão regenerados antes de remover o
segredo antigo; não haverá troca silenciosa que invalide todos os links.

## Consequências

### Positivas

- Um vazamento do banco não revela links utilizáveis.
- Tokens não são enumeráveis e a rotação invalida o acesso anterior imediatamente.
- O fragmento reduz exposição em logs de proxy, histórico de servidor e `Referer`.

### Negativas e trade-offs

- O link não pode ser recuperado depois da exibição inicial.
- Trocar o `pepper` exige uma janela de rotação planejada ou regenerar convites ativos.
- O fluxo de troca por sessão pública adiciona uma etapa à implementação.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Tentativa aleatória | 256 bits de entropia, rate limit e métricas sem registrar o token |
| Token em logs | Fragmento na URL, campos sensíveis mascarados e testes de logging |
| Vazamento do banco | HMAC com `pepper` externo ao banco |
| Corrida durante rotação | Transação, unicidade e teste concorrente |
| Reutilização do token antigo | Revogação atômica e validação de estado/expiração em toda troca |

## Critérios de revisão

- O produto precisar reenviar o mesmo link sem regenerá-lo.
- Surgir distribuição por um provedor que exija o token em outro formato.
- A rotação de `pepper` precisar ocorrer sem regenerar convites.

## Referências

- Issue #15.
- RN-INV-001, RN-INV-005 e RN-INV-007.
- RNF-SEC-004, RNF-SEC-005 e RNF-SEC-007.
