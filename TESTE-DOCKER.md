# Ambiente descartável de integração (E0.3)

`compose.test.yaml` cria um MySQL 8.0.44, igual à versão observada na base local, e Redis 7.4. Os serviços ficam em uma bridge dedicada do projeto. As portas publicadas aceitam conexões somente de `127.0.0.1`, e os dados do MySQL ficam em um volume com nome próprio do projeto. O Redis não persiste dados.

As credenciais declaradas no Compose são públicas e exclusivas deste ambiente local de testes. Nunca reutilize esse arquivo ou essas credenciais em homologação ou produção. O Compose inicia somente os serviços de apoio: não monta o `.env`, não executa o backend, seeds ou migrations e não configura conexão com o MySQL Aiven nem o Redis externo. Uma bridge Docker comum permite tráfego de saída dos containers; os serviços definidos não recebem credenciais externas e não iniciam conexões para provedores da aplicação. Se um backend for adicionado futuramente, separar seu egress e substituir o `.env` antes de iniciá-lo.

## Pré-requisitos

- Docker Desktop para Windows com backend WSL 2 e Docker Compose v2. Abra o Docker Desktop e aguarde o engine Linux iniciar antes dos comandos abaixo.
- WSL 2 instalado e atualizado. Consulte a [instalação oficial do Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/) para os requisitos da versão instalada.

## Comandos no PowerShell

A partir da raiz do repositório:

```powershell
docker compose -f compose.test.yaml config
docker compose -f compose.test.yaml up -d --wait
docker compose -f compose.test.yaml ps
docker compose -f compose.test.yaml logs --tail 50
```

Verifique MySQL e Redis como `healthy` antes de conectar qualquer teste. O MySQL responde em `127.0.0.1:13306` com o banco `secureplay_test`; o Redis em `127.0.0.1:16379`. Dentro da rede do Compose, os nomes dos serviços são `mysql` e `redis`.

Para parar os serviços preservando os dados fictícios dessa base descartável:

```powershell
docker compose -f compose.test.yaml down
```

Para remover também o volume MySQL criado por este projeto e apagar os dados desse ambiente descartável:

```powershell
docker compose -f compose.test.yaml down --volumes
```

Confira o projeto e o arquivo Compose antes de executar a remoção. Não rode comandos para volumes globais, prune, outros projetos ou containers que não foram criados por este arquivo.

## Limites desta entrega

A configuração foi validada e iniciada em 19/10/2026, conforme abaixo. Ainda não há massa sintética de duas escolas nem execução do backend contra esses serviços; o `.env` comum não foi carregado.


## Estado verificado em 19/10/2026

- Docker CLI 29.9.1; Docker Compose 5.6.0; WSL versão padrão 2/kernel 6.1.54; Docker Desktop engine Linux ativo. `docker compose config --quiet` e `up -d --wait` aprovados.
- Containers MySQL 8.0.44 e Redis 7.4-alpine reportaram `healthy`. As portas responderam em `127.0.0.1:13306` e `127.0.0.1:16379`. `docker port` confirmou mapeamentos somente para `127.0.0.1`.
- Consulta somente de metadados no banco retornou versão 8.0.44, database `secureplay_test` e zero tabelas. Redis respondeu `PONG` e apresentou zero chaves. O volume novo é nomeado pelo projeto e tem escopo local do Docker.
- A rede `internal: true` não publicou as portas na experiência executada. Ela foi removida para permitir conexão do host. A bridge atual permite egress dos containers; contém somente os serviços oficiais MySQL/Redis, sem credenciais ou configuração de provedores da aplicação, e nenhum backend é executado. Antes de adicionar backend, planeje a configuração de teste e o controle de egress.
- Os dois containers permanecem ativos para a próxima parcela. Para pará-los e preservar o volume, rode `docker compose -f compose.test.yaml down`.
