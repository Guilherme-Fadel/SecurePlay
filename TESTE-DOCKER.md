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

A configuração foi validada e iniciada em 19/10/2026, conforme abaixo. As migrations foram aplicadas ao MySQL descartável. Ainda não há massa sintética de duas escolas nem execução do backend/AppModule contra esses serviços; o `.env` comum não foi carregado.


## Ensaio inicial dos containers, antes das migrations — 19/10/2026

- Docker CLI 29.9.1; Docker Compose 5.6.0; WSL versão padrão 2/kernel 6.1.54; Docker Desktop engine Linux ativo. `docker compose config --quiet` e `up -d --wait` aprovados.
- Containers MySQL 8.0.44 e Redis 7.4-alpine reportaram `healthy`. As portas responderam em `127.0.0.1:13306` e `127.0.0.1:16379`. `docker port` confirmou mapeamentos somente para `127.0.0.1`.
- Antes da aplicação das migrations, consulta somente de metadados retornou MySQL 8.0.44, database `secureplay_test` e zero tabelas. Redis respondeu `PONG` e apresentou zero chaves. O volume novo é nomeado pelo projeto e tem escopo local do Docker.
- A rede `internal: true` não publicou as portas na experiência executada. Ela foi removida para permitir conexão do host. A bridge atual permite egress dos containers; contém somente os serviços oficiais MySQL/Redis, sem credenciais ou configuração de provedores da aplicação, e nenhum backend é executado. Antes de adicionar backend, planeje a configuração de teste e o controle de egress.
- Os dois containers permanecem ativos para a próxima parcela. Para pará-los e preservar o volume, rode `docker compose -f compose.test.yaml down`.


## Migrations no banco descartável

Em 19/10/2026, as 13 migrations pendentes foram aplicadas ao database `secureplay_test` do Compose. Para repetir, confirme primeiro o projeto e as portas. O bloco abaixo salva e restaura as variáveis de ambiente do processo e fixa todo o destino no Compose local. A validação aborta antes de conectar se host, porta, database, SSL ou sincronização divergirem. As credenciais são as fixas de teste declaradas no Compose. Não acrescente `--env-file` nem carregue o `.env` comum.

```powershell
$names = @('NODE_ENV', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_SSL', 'DB_SYNCHRONIZE')
$previous = @{}
foreach ($name in $names) {
  $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

try {
  $env:NODE_ENV = 'test'
  $env:DB_HOST = '127.0.0.1'
  $env:DB_PORT = '13306'
  $env:DB_USER = 'secureplay_test_user'
  $env:DB_PASSWORD = 'secureplay_test_password'
  $env:DB_NAME = 'secureplay_test'
  $env:DB_SSL = 'false'
  $env:DB_SYNCHRONIZE = 'false'

  if ($env:DB_HOST -ne '127.0.0.1' -or $env:DB_PORT -ne '13306' -or
      $env:DB_NAME -ne 'secureplay_test' -or $env:DB_SSL -ne 'false' -or
      $env:DB_SYNCHRONIZE -ne 'false') {
    throw 'Destino inseguro; migrations canceladas.'
  }

  Push-Location backend
  try {
    node -r ./node_modules/ts-node/register -r ./node_modules/tsconfig-paths/register ./node_modules/typeorm/cli.js migration:show -d ./src/database/migration-data-source.ts
    if ($LASTEXITCODE -ne 0) { throw 'migration:show falhou.' }
    node -r ./node_modules/ts-node/register -r ./node_modules/tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d ./src/database/migration-data-source.ts
    if ($LASTEXITCODE -ne 0) { throw 'migration:run falhou.' }
  }
  finally { Pop-Location }
}
finally {
  foreach ($name in $names) {
    [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
  }
}
```

A migration `SeedCatalog` inclui um catálogo fictício (atualmente 6 módulos/42 aulas) e não tem `down()` automático. A remoção completa deste banco de teste exige `docker compose -f compose.test.yaml down --volumes`, que apaga o volume MySQL nomeado pelo projeto. Não use esse comando se quiser preservar dados de teste criados depois.


## Smoke dos providers backend sem AppModule

Com os containers em execução e as migrations aplicadas, execute da pasta `backend`:

```powershell
node -r ts-node/register scripts/smoke-docker-services.cjs
```

O script usa os providers reais de MySQL e Redis, fixa valores locais de teste, recusa variáveis herdadas conflitantes e não carrega `.env`. Confere database/histórico de migrations e executa SET/GET/DEL em uma chave Redis aleatória, removendo-a ao terminar (com TTL de 60 segundos como proteção secundária). Não importa AppModule, não inicia servidor e não cria escolas/usuários. Saída esperada começa com `OK: MySQL 8.0.44 (secureplay_test); 13 migrations; Redis SET/GET/DEL`.
