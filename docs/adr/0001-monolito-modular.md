# ADR 0001 — Monólito modular e limites iniciais

- **Status:** Aceito
- **Data:** 2026-08-03
- **Decisor:** Tobias Felipe Kiefer
- **Substitui:** não se aplica
- **Substituído por:** não se aplica

## Contexto

O MVP será desenvolvido e operado por uma pessoa. Convites, convidados, RSVP e casamento participam
de transações próximas e ainda não existem métricas que justifiquem distribuição. Microsserviços
adicionariam implantação, observabilidade, consistência e recuperação distribuídas antes de existir
benefício mensurável.

## Opções consideradas

1. Monólito modular organizado por capacidades de negócio.
2. Monólito organizado apenas por camadas técnicas.
3. Microsserviços independentes desde o início.

## Decisão

O backend será um monólito modular com os módulos `auth`, `wedding`, `guest`, `invitation` e `rsvp`.
`shared` conterá somente capacidades técnicas realmente compartilhadas.

Cada módulo possuirá contratos explícitos. Regras de negócio não dependerão de controllers,
persistência ou detalhes de outros módulos. Acesso direto ao repositório ou às entidades internas de
outro módulo não será permitido. Eventos de domínio serão inicialmente internos e processados no
mesmo processo.

Testes de arquitetura deverão fiscalizar esses limites quando as primeiras dependências entre módulos
forem introduzidas. A extração de um serviço exigirá novo ADR baseado em métricas, necessidade de
implantação independente e estratégia de dados e consistência.

## Consequências

### Positivas

- Implantação, transações e diagnóstico permanecem simples no MVP.
- Limites de domínio podem amadurecer antes de virarem fronteiras de rede.
- O sistema pode ser escalado verticalmente ou replicado como uma única unidade.

### Negativas e trade-offs

- Um defeito ou pico pode afetar toda a API.
- Disciplina e testes são necessários para evitar um monólito acoplado.
- Módulos não podem ser escalados ou implantados separadamente.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Dependências cíclicas | Contratos explícitos, revisão de imports e testes com ArchUnit |
| Crescimento de `shared` | Exigir reutilização concreta e proibir regras de negócio nesse módulo |
| Extração prematura | Exigir métricas, caso de uso e novo ADR |

## Critérios de revisão

- Um módulo precisa de escala ou disponibilidade materialmente diferente.
- O ciclo de entrega é bloqueado por acoplamento entre equipes ou capacidades.
- Medições demonstram que a implantação única não atende aos requisitos.

## Referências

- RNF-MNT-001 e RNF-MNT-005.
- Especificação, seções 12.1 e 12.3.
