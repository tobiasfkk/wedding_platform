# Infraestrutura

Ambiente local e configurações de implantação da Wedding Platform.

## Pré-requisitos

- Docker Desktop ou Docker Engine;
- Docker Compose v2, disponível pelo comando `docker compose`.

Execute os comandos no terminal em que `docker` está disponível. Quando o Docker Engine estiver
instalado dentro do WSL, abra o terminal da distribuição Linux, navegue até o repositório em
`/mnt/<unidade>/...` e use os mesmos comandos abaixo.

## PostgreSQL local

Na raiz do repositório, inicie o PostgreSQL com um único comando:

```bash
docker compose --file infrastructure/compose.yaml up --detach --wait
```

O Compose usa PostgreSQL 18.4, publica a porta local `5433`, aguarda o health check e mantém os dados no
volume nomeado `wedding-platform_postgres_data`.

Valores locais padrão:

| Propriedade | Valor |
|---|---|
| Banco | `wedding` |
| Usuário | `wedding` |
| Senha | `wedding_local` |
| Host | `localhost` |
| Porta local | `5433` |

A porta `5433` evita conflito com instalações nativas de PostgreSQL, que normalmente usam `5432`.
Dentro da rede Docker, o serviço continua ouvindo em `5432`.

Esses valores são deliberadamente locais e não devem ser reutilizados em homologação ou produção.

### Personalização local

Copie o exemplo para um arquivo ignorado pelo Git:

```powershell
Copy-Item infrastructure/.env.example infrastructure/.env
```

Use o arquivo explicitamente ao executar o Compose:

```bash
docker compose --env-file infrastructure/.env --file infrastructure/compose.yaml up --detach --wait
```

As mesmas variáveis `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_PORT` podem ser
fornecidas ao backend. `POSTGRES_HOST` também é aceito pelo backend e usa `localhost` por padrão.

### Operação

Consultar estado e health check:

```bash
docker compose --file infrastructure/compose.yaml ps
```

Consultar logs:

```bash
docker compose --file infrastructure/compose.yaml logs --follow postgres
```

Abrir o cliente `psql` dentro do container:

```bash
docker compose --file infrastructure/compose.yaml exec postgres psql --username wedding --dbname wedding
```

Parar o ambiente preservando os dados:

```bash
docker compose --file infrastructure/compose.yaml stop
```

Remover o container e a rede preservando o volume:

```bash
docker compose --file infrastructure/compose.yaml down
```

### Limpeza controlada

O comando abaixo remove também o volume e apaga definitivamente todos os dados locais do banco:

```bash
docker compose --file infrastructure/compose.yaml down --volumes
```

Confira o projeto exibido por `docker compose ... ps` antes de executar a limpeza. Dados do volume
removido não são recuperáveis sem backup.

## Próximas etapas

- Flyway e schema inicial: Issue `#8`;
- pipeline de integração contínua: Issue `#9`;
- proxy, deploy e observabilidade: fases de lançamento e operação.

Credenciais reais, arquivos `.env` e diretórios de dados nunca devem ser versionados.
