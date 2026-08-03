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

## API de configuração do casamento

| Método e rota | Acesso | Resultado |
|---|---|---|
| `GET /api/admin/wedding` | Administrador | Consulta a configuração atual ou um rascunho vazio |
| `PUT /api/admin/wedding` | Administrador com CSRF | Cria ou atualiza os dados essenciais do casamento |

Datas e horários são recebidos separadamente e convertidos para instantes usando o `timeZone`
IANA do evento (por padrão, `America/Sao_Paulo`). A data-limite do RSVP deve ser igual ou anterior
ao início do casamento.

## Perfis e banco local

O perfil `local` é usado por padrão e conecta ao PostgreSQL com os seguintes valores locais:

| Variável | Valor padrão |
|---|---|
| `POSTGRES_HOST` | `localhost` |
| `POSTGRES_PORT` | `5433` |
| `POSTGRES_DB` | `wedding` |
| `POSTGRES_USER` | `wedding` |
| `POSTGRES_PASSWORD` | `wedding_local` |

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

`DATABASE_CONNECTION_TIMEOUT_MS` é opcional e usa `5000` por padrão.

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
