# Infraestrutura

Configurações necessárias para executar e publicar a Wedding Platform.

## Estado atual

O ambiente ainda não foi criado. PostgreSQL e Docker Compose serão introduzidos na Issue `#7`; proxy, deploy e observabilidade serão adicionados nas fases correspondentes.

## Conteúdo planejado

- ambiente local com Docker Compose;
- configuração de PostgreSQL;
- Nginx como proxy reverso quando aplicável;
- manifestos e scripts de implantação;
- configuração de métricas, logs e alertas;
- procedimentos de backup e restauração.

Dados persistentes, credenciais e arquivos `.env` locais não devem ser versionados.
