# ADR 0003 - Economia de Tokens de Operacao e XP decrescente no arcade de minigames

Status: Aceito. Data: 2026-08-26.

## Context

A secao Desafios precisava evoluir de mock estatico para um arcade servido pela API, com tres minigames novos (Quiz Relampago, Caca ao Phishing, Classificacao de Dados) e uma economia unificada.

Problemas identificados:

1) Sem mecanismo anti-farming: repeticao infinita de jogos permitiria subir ranking sem limite.
2) Logica de creditar XP duplicada em 3 services (challenge, aula, dashboard) - divida registrada no ADR 0001 item 16.
3) Necessidade de economia server-side que unifique tokens de acesso e recompensa decrescente para todos os minigames.

## Decision

1) Tokens de Operacao (teto 5, regeneracao 1 a cada 30 min, recarga no check-in diario) vivem no Redis como fonte de verdade.
   - Chave: `op-tokens:{usuario_id}` com JSON { balance, lastRegenAt }.
   - Regeneracao lazy: calculada no acesso, sem job agendado.
   - Consumo atomico via Lua script (read-modify-write) para evitar corrida em duplo-clique/duas abas.

2) XP decrescente por jogo por dia: 1a conclusao = 100%, 2a = 50%, 3a em diante = 25%, piso minimo de 10 XP (exceto score 0 que resulta em 0 XP).
   - Contador diario em `arcade-plays:{usuario_id}:{game_slug}:{yyyy-mm-dd}` (Redis, TTL fim do dia).

3) Catalogo de jogos: entidade ArcadeGame com campo active para controlar disponibilidade. O campo game_type liga o jogo ao handler de correcao correspondente.

4) Modelos de dados dos minigames:
   - Quiz Relampago: reusa a entidade Question existente (sem entidade nova).
   - Caca ao Phishing: entidade nova PhishingSample (dominio de amostra com sinais nao cabe em Question).
   - Classificacao de Dados: entidade nova DataItem (item + classificacao correta).

5) Credito de XP centralizado em common/gamification/xp.service.ts.
   - Resolve parcialmente a duplicacao do ADR 0001 item 16.
   - O arcade usa exclusivamente este service; os demais dominios (challenge/aula/dashboard) podem migrar em follow-up.

6) Partida (run) escopada no Redis com TTL de 30 min (`arcade-run:{usuario_id}:{runId}`).
   - Gabarito armazenado apenas no servidor; nunca enviado ao cliente.
   - Submit consome e apaga a run (idempotencia).

7) RedisService estendido com incrBy, decrBy, eval (Lua) e del para suportar operacoes atomicas.

## Alternatives

1) Token em coluna MySQL (UsuarioStats): exigiria 2 colunas novas + migration; nao casa com a natureza temporal/regenerativa do saldo. Rejeitado.

2) Teto seco de XP diario (ex.: max 500/dia): punitivo para quem joga bem; nao diferencia jogos nem incentiva variedade. Rejeitado.

3) Tudo via entidade Challenge existente: dominio de phishing/classificacao nao cabe em Question; forcaria schema ruim e poluiria o desafio diario. Rejeitado.

4) Job agendado (cron) para regeneracao de tokens: complexidade operacional desnecessaria; abordagem lazy e suficiente para a escala atual e evita dependencia de scheduler. Rejeitado.

## Consequences

1) Dependencia do Redis para saldo de tokens. Perda de cache reseta saldo e relogio de regeneracao, resultando em recarga favoravel ao usuario. Risco aceito para gamificacao (nao e dado financeiro).

2) Base extensivel: novos jogos sao plugaveis via game_type + handler sem alterar a economia existente.

3) XpService compartilhado disponivel para migrar challenge/aula/dashboard no futuro (follow-up registrado, nao obrigatorio agora).

4) synchronize:true criou 3 tabelas novas (ArcadeGame, PhishingSample, DataItem) automaticamente em desenvolvimento. Migrations continuam como divida para producao (ADR 0001 item 1).

5) Operacoes atomicas no Redis (Lua script, incrBy/decrBy) beneficiam futuros usos alem do arcade.
