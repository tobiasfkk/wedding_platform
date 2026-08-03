# ADR 0002 — Autenticação e autorização administrativa

- **Status:** Aceito
- **Data:** 2026-08-03
- **Decisor:** Tobias Felipe Kiefer
- **Substitui:** não se aplica
- **Substituído por:** não se aplica

## Contexto

A área administrativa modifica dados pessoais e configurações do evento. O frontend Angular e a API
Spring Boot serão aplicações distintas, mas usarão subdomínios do mesmo domínio registrável em
produção. O MVP não precisa delegar autenticação a terceiros nem expor tokens para outros clientes.

## Opções consideradas

1. Sessão opaca no servidor com Spring Security e Spring Session JDBC.
2. Tokens JWT de acesso e refresh mantidos pelo navegador.
3. Provedor externo de identidade.

## Decisão

A autenticação administrativa usará Spring Security com sessão opaca persistida no PostgreSQL por
Spring Session JDBC. O navegador receberá apenas um cookie de sessão `HttpOnly`, `Secure` e
`SameSite=Lax`. O frontend e a API usarão HTTPS e subdomínios do mesmo site; CORS aceitará somente as
origens explicitamente configuradas e requisições mutáveis exigirão token CSRF compatível com Angular.

Senhas serão armazenadas com Argon2id e parâmetros versionados. Um login bem-sucedido renovará o
identificador da sessão; logout e troca ou recuperação de senha invalidarão as sessões existentes.
Erros de login serão genéricos e tentativas serão limitadas por conta e origem.

O modelo permitirá mais de uma conta administrativa, mas o MVP terá apenas o papel `ADMIN`, sem
hierarquia de permissões. Não haverá recuperação pública por e-mail no MVP. A recuperação será feita
por um comando administrativo versionado, executado com acesso operacional controlado e pelo mesmo
serviço de domínio — nunca por edição SQL manual. Ele gerará novo hash, revogará sessões e registrará
auditoria sem expor ou registrar a senha.

## Consequências

### Positivas

- Credenciais de longa duração não ficam acessíveis ao JavaScript.
- Revogação e logout são imediatos.
- O PostgreSQL já existente evita introduzir Redis somente para sessões.

### Negativas e trade-offs

- Cada requisição autenticada consulta ou atualiza o armazenamento de sessão.
- Cookies exigem configuração correta de CORS e CSRF.
- Indisponibilidade do PostgreSQL também invalida o acesso administrativo.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Roubo de sessão | HTTPS, cookie `HttpOnly`/`Secure`, rotação no login, expiração curta e revogação |
| CSRF | Token CSRF, `SameSite=Lax` e allowlist estrita de origens |
| Força bruta e enumeração | Resposta genérica, rate limit por conta e IP, atraso progressivo e métricas |
| Vazamento de senha | Argon2id, segredo somente em memória durante a operação e proibição em logs |
| Escalada de privilégio | Autorização no servidor em todo endpoint administrativo e testes negativos |

## Critérios de revisão

- Surgirem clientes não baseados em navegador ou integração de terceiros.
- SSO, MFA ou recuperação autônoma se tornarem requisitos.
- A carga de sessões justificar armazenamento dedicado.

## Referências

- Issue #11.
- RNF-SEC-001, RNF-SEC-002, RNF-SEC-003, RNF-SEC-005 e RNF-SEC-007.
- [Spring Session JDBC](https://docs.spring.io/spring-session/reference/configuration/jdbc.html).
- [Proteção CSRF no Spring Security](https://docs.spring.io/spring-security/reference/features/exploits/csrf.html).
