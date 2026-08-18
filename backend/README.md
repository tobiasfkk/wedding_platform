# Backend

API e regras de negócio da Wedding Platform, implementadas em Java 21 e Spring Boot 4.1.

## Pré-requisitos

- JDK 21;
- PostgreSQL local iniciado conforme [infrastructure/README.md](../infrastructure/README.md);
- acesso à internet na primeira execução para o Maven Wrapper baixar o Maven e as dependências.

Não é necessário instalar Maven globalmente.

## Comandos

No Windows PowerShell, a partir de `backend/`:

```powershell
.\mvnw.cmd test
.\mvnw.cmd package
.\mvnw.cmd spring-boot:run
```

No Linux ou macOS:

```bash
./mvnw test
./mvnw package
./mvnw spring-boot:run
```

Com a aplicação em execução, consulte:

```text
GET http://localhost:8080/actuator/health
```

O resultado esperado é HTTP `200` com estado `UP`. O health check é público e não apresenta
detalhes internos; os endpoints administrativos são protegidos por sessão.

## Administrador local

Antes da primeira inicialização, informe uma conta administrativa por variáveis de ambiente:

```powershell
$env:ADMIN_INITIAL_EMAIL = "admin@wedding.local"
$env:ADMIN_INITIAL_PASSWORD = "uma-senha-local-com-12-ou-mais-caracteres"
.\mvnw.cmd spring-boot:run
```

A conta é criada somente se o e-mail ainda não existir. A senha é transformada em hash Argon2id
antes da persistência e não é registrada em logs. Depois da criação, remova as variáveis do terminal.
Em produção, injete-as pelo gerenciador de segredos apenas na criação inicial.

O frontend usa o proxy local para chamar a API. Abra `http://localhost:4200/admin`; visitantes sem
sessão são direcionados para `/admin/login`.

## API de autenticação

| Método e rota | Acesso | Resultado |
|---|---|---|
| `GET /api/auth/session` | Público | Estado da sessão e token CSRF |
| `POST /api/auth/login` | Público com CSRF | Cria e rotaciona a sessão administrativa |
| `POST /api/auth/logout` | Administrador com CSRF | Invalida a sessão |
| `GET /api/admin/me` | Administrador | Confirma a identidade da sessão protegida |

Login inválido sempre devolve uma mensagem genérica. Após cinco falhas para a mesma combinação de
conta e origem em quinze minutos, novas tentativas recebem `429` sem revelar se a conta existe.

## API de convidados

Todas as rotas exigem uma sessão administrativa; operações de escrita também exigem CSRF.

| Método e rota | Resultado |
|---|---|
| `GET /api/admin/guests` | Lista convidados com busca, filtro de estado e paginação |
| `POST /api/admin/guests` | Cadastra um convidado no casamento atual |
| `PUT /api/admin/guests/{id}` | Atualiza nome, contato opcional e estado |
| `PATCH /api/admin/guests/{id}/status` | Inativa ou reativa sem excluir o histórico |

A listagem aceita `query`, `status` (`ALL`, `ACTIVE` ou `INACTIVE`), `page` baseado em zero e
`size` entre 1 e 100. Dados pessoais não são escritos nos logs da aplicação.

## API de convites

| Método e rota | Resultado |
|---|---|
| `GET /api/admin/invitations` | Lista convites com busca, estado e paginação |
| `GET /api/admin/invitations/eligible-guests` | Busca convidados ativos disponíveis para vínculo |
| `POST /api/admin/invitations` | Cria um convite em rascunho |
| `PUT /api/admin/invitations/{id}` | Atualiza grupo, limite e vínculos atomicamente |
| `POST /api/admin/invitations/{id}/activate` | Ativa o convite e retorna o link uma única vez |
| `POST /api/admin/invitations/{id}/regenerate-link` | Revoga o código atual e retorna um novo link |
| `POST /api/admin/invitations/{id}/inactivate` | Inativa o convite e revoga imediatamente o código |
| `GET /api/admin/invitations/{id}/rsvp` | Consulta a resposta atual de participantes e acompanhantes |
| `PUT /api/admin/invitations/{id}/rsvp` | Registra ou corrige a resposta em nome do administrador |
| `GET /api/admin/rsvp/dashboard` | Consulta totais e convites com busca, estado e paginação |
| `GET /api/admin/rsvp/deadline` | Consulta a data-limite das confirmações públicas |
| `PUT /api/admin/rsvp/deadline` | Configura a data, o horário e o fuso do prazo público |

O convite exige nome, limite de acompanhantes entre 0 e 100 e ao menos um convidado ativo. Cada
convidado possui somente um vínculo corrente; remoções encerram o vínculo sem apagar seu histórico.
Convites permanecem como `DRAFT` até a ativação. Cada código possui 256 bits de entropia e somente
seu HMAC-SHA-256 é armazenado. O link original aparece apenas na resposta de ativação ou regeneração;
se for perdido, deve ser regenerado. A rotação preserva o resumo anterior para auditoria, mas o
revoga atomicamente. Tokens e links nunca são escritos nos logs.

A confirmação pública pode ser alterada até a data-limite configurada. Depois do prazo, o convidado
ainda consulta a resposta atual em modo somente leitura. A correção administrativa do RSVP não é
limitada pelo prazo público e exige confirmação explícita
para substituir uma resposta existente. Ela aplica os mesmos limites e invariantes do fluxo público,
mantém a operação idempotente e registra `ADMIN`, o e-mail do administrador e o instante em submissão
e histórico. O estado corrente é atualizado sem apagar alterações anteriores.

O dashboard considera somente a versão atual de cada resposta. Acompanhantes ativos entram no
total de confirmados; os filtros por nome ou situação e a paginação são processados no banco. Os
nomes de participantes e acompanhantes são retornados apenas neste endpoint administrativo.

## API pública de acesso ao RSVP

| Método e rota | Resultado |
|---|---|
| `GET /api/rsvp/session` | Emite CSRF e consulta uma identificação pública ainda válida |
| `POST /api/rsvp/access` | Troca o código enviado no corpo por uma sessão limitada ao convite |
| `POST /api/rsvp/responses` | Salva atomicamente participantes e acompanhantes do convite identificado |

O link individual abre a página principal em `/#code=...`. O frontend lê o código do fragmento,
remove-o imediatamente da URL e o envia uma única vez no corpo HTTPS. A sessão guarda somente os
identificadores internos do convite e da versão do código;
ela deixa de funcionar se o convite for inativado ou o link for regenerado. A resposta pública contém
apenas nome do grupo, identificador, nome e estado RSVP dos participantes ativos, limite e lista atual
de acompanhantes, sem contatos ou dados administrativos. Código aleatório, antigo ou inativo recebe a
mesma resposta genérica.

O salvamento recebe um `operationId` UUID, a lista completa de participantes com estado `PENDING`,
`CONFIRMED` ou `DECLINED` e a lista completa de acompanhantes com identificador UUID e nome. O servidor
bloqueia alterações concorrentes no mesmo convite, valida nomes obrigatórios e o limite configurado,
rejeita pessoas ausentes ou pertencentes a outro grupo e persiste toda a resposta na mesma transação.
Remover um acompanhante preserva seu registro como histórico. Repetir o mesmo `operationId` com o
mesmo conteúdo retorna sucesso sem duplicar registros;
reutilizá-lo com conteúdo diferente retorna conflito. O histórico registra instante e origem
`PUBLIC_LINK`, sem armazenar endereço IP ou o código do convite.

Após dez tentativas inválidas pela mesma origem em quinze minutos, novas trocas recebem `429`. O
limite é mantido em memória no MVP; em uma implantação com múltiplas instâncias ele deverá migrar para
um armazenamento compartilhado. Em produção, cabe à infraestrutura encaminhar o endereço de origem
confiável, processado por `server.forward-headers-strategy=framework`.

## Configuração do Pix

| Método e rota | Acesso | Resultado |
|---|---|---|
| `GET /api/public/pix` | Público | Retorna somente os dados públicos necessários para pagamento |
| `GET /api/admin/pix` | Administrador | Consulta a configuração atual |
| `PUT /api/admin/pix` | Administrador com CSRF | Valida e atualiza a configuração |

O cadastro é feito em `/admin/pix`. Informe o nome público do recebedor, a chave opcional que pode
ser exibida ao convidado e o código completo “Pix Copia e Cola” fornecido pelo banco. O backend valida
o marcador do BR Code e o CRC16 antes de persistir a configuração em `wedding.wedding_event`.

O QR Code não é armazenado como imagem: o frontend o gera localmente a partir do código validado.
Assim, não é necessário adicionar o arquivo às fotos estáticas nem manter conteúdo binário no banco.
Esses campos são dados públicos de pagamento; senhas, tokens bancários e credenciais nunca devem ser
informados nesse formulário.

## Perfis e banco local

O perfil `local` é usado por padrão e conecta ao PostgreSQL com os seguintes valores locais:

| Variável | Valor padrão |
|---|---|
| `POSTGRES_HOST` | `localhost` |
| `POSTGRES_PORT` | `5433` |
| `POSTGRES_DB` | `wedding` |
| `POSTGRES_USER` | `wedding` |
| `POSTGRES_PASSWORD` | `wedding_local` |
| `INVITATION_CODE_PEPPER` | segredo local de desenvolvimento |
| `INVITATION_CODE_PEPPER_VERSION` | `1` |
| `PUBLIC_SITE_URL` | `http://localhost:4200` |

O Hibernate não cria nem altera tabelas automaticamente. O Flyway executa e valida as migrações de
`src/main/resources/db/migration` durante a inicialização. Uma migração inválida interrompe o startup
e identifica o script que precisa ser corrigido.

O perfil `test` mantém DataSource, JPA e Flyway desativados nos testes de contexto que não dependem de
banco. Os testes de migração usam PostgreSQL real via Testcontainers e são ignorados automaticamente
quando não existe um Docker acessível.

Para produção, ative o perfil `production` e forneça as credenciais fora do artefato:

| Variável obrigatória | Descrição |
|---|---|
| `DATABASE_URL` | URL JDBC do PostgreSQL |
| `DATABASE_USERNAME` | Usuário do banco |
| `DATABASE_PASSWORD` | Senha do banco |
| `INVITATION_CODE_PEPPER` | Segredo aleatório com pelo menos 32 caracteres, externo ao banco |
| `PUBLIC_SITE_URL` | Origem HTTPS do frontend público, sem barra final |

`DATABASE_CONNECTION_TIMEOUT_MS` e `INVITATION_CODE_PEPPER_VERSION` são opcionais e usam `5000` e
`1`, respectivamente. Durante a rotação planejada do segredo, também podem ser informados
`INVITATION_CODE_PREVIOUS_PEPPER` e `INVITATION_CODE_PREVIOUS_PEPPER_VERSION` até todos os links da
versão anterior serem regenerados.

## Formato de erros

A API responde erros como `application/problem+json`. Erros de validação seguem este contrato:

```json
{
  "type": "urn:wedding:error:validation",
  "title": "Dados inválidos",
  "status": 400,
  "detail": "Um ou mais campos são inválidos.",
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-08-03T12:00:00Z",
  "errors": [
    { "field": "name", "message": "deve ser informado" }
  ]
}
```

Erros inesperados retornam o código `INTERNAL_ERROR` e uma mensagem genérica. Exceções, stack traces,
credenciais e outros detalhes internos nunca fazem parte da resposta pública.

## Organização modular

```text
com.tobias.wedding
├── auth
├── wedding
├── guest
├── invitation
├── rsvp
└── shared
    └── config
```

Cada pacote representa uma capacidade do domínio. Dependências entre módulos devem ser explícitas;
`shared` é reservado a capacidades técnicas realmente compartilhadas e não deve concentrar regras
de negócio.

## Dependências iniciais

- Spring Web MVC;
- Spring Validation;
- Spring Security;
- Spring Data JPA;
- Spring Boot Actuator;
- PostgreSQL Driver;
- Flyway e suporte a PostgreSQL;
- Testcontainers;
- starters de teste correspondentes do Spring Boot.

A documentação OpenAPI será adicionada na Issue correspondente.
