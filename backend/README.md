# Backend

API e regras de negócio da Wedding Platform, implementadas em Java 21 e Spring Boot 4.1.

## Pré-requisitos

- JDK 21;
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

O resultado esperado é HTTP `200` com estado `UP`. O health check é público e não apresenta detalhes internos; os demais endpoints são protegidos por padrão. Ainda não existem usuários locais: a autenticação real será implementada na Issue `#11`.

## Perfis

O perfil `local` é usado por padrão e desativa temporariamente a autoconfiguração de JPA e DataSource. Isso permite iniciar a fundação do backend sem credenciais ou dependência externa. A persistência PostgreSQL será ativada na Issue `#7`.

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

Cada pacote representa uma capacidade do domínio. Dependências entre módulos devem ser explícitas; `shared` é reservado a capacidades técnicas realmente compartilhadas e não deve concentrar regras de negócio.

## Dependências iniciais

- Spring Web MVC;
- Spring Validation;
- Spring Security;
- Spring Data JPA;
- Spring Boot Actuator;
- PostgreSQL Driver;
- starters de teste correspondentes do Spring Boot.

Flyway, Testcontainers e documentação OpenAPI serão adicionados nas Issues correspondentes.
