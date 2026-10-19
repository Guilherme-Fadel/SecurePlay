# Ambiente descartável de integração (E0.3)

`compose.test.yaml` cria um MySQL 8.0.44, igual à versão observada na base local, e Redis 7.4. A rede Docker é interna, as portas publicadas aceitam conexões somente de `127.0.0.1`, e os dados do MySQL ficam em um volume com nome próprio do projeto. O Redis não persiste dados.

As credenciais declaradas no Compose são públicas e exclusivas deste ambiente local de testes. Nunca reutilize esse arquivo ou essas credenciais em homologação ou produção. O Compose inicia somente os serviços de apoio: não monta o `.env`, não executa o backend, seeds ou migrations e não se conecta ao MySQL Aiven nem ao Redis externo.

## Pré-requisitos

- Docker Desktop para Windows com backend WSL 2 e Docker Compose v2.
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

A configuração está preparada, mas ainda não foi carregada pelo Docker: neste computador o comando Docker não está instalado e o WSL reporta que não está instalado. Portanto `docker compose config`, pull, healthchecks e inicialização permanecem pendentes. Ainda não há massa sintética de duas escolas nem execução do backend contra esses serviços. Isso exige uma etapa seguinte, após verificar o ambiente real e manter uma configuração explícita que não carregue o `.env` comum.
