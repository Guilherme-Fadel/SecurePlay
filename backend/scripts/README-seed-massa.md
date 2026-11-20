# Massa de teste (seed-massa)

Gera 6 escolas "Escola Massa NN (massa)", cada uma com 2 admins, 5 professores, 500 alunos
(3000 no total) e 20 turmas (~25 alunos, 2 professores por turma), com XP/nível e algumas aulas
concluídas. Só adiciona registros; nunca altera os que não são da massa.

## Como rodar

```
SEED_MASSA_CONFIRMAR=<valor de DB_NAME> npm run db:seed-massa
```

- Recusa `NODE_ENV=production`.
- `SEED_MASSA_CONFIRMAR` precisa ser igual a `DB_NAME`; senão imprime o destino e sai com código 1 sem escrever.
- Senha: `SEED_MASSA_SENHA` (mínimo 12 caracteres) ou uma senha aleatória, impressa uma única vez ao final.
  É a mesma para todos e nunca é gravada em arquivo.
- Admins exigem MFA: precisarão cadastrá-lo no primeiro login.

## Idempotência

A massa é marcada pelo e-mail `@massa.secureplay.test` e pelo nome da escola `(massa)`. Cada escola é
criada em uma transação; se a escola já existe, é ignorada (não duplica). Rodar de novo só completa
escolas ausentes.

## Limpar

```
SEED_MASSA_CONFIRMAR=<DB_NAME> npm run db:seed-massa -- --limpar
```

Remove só a massa (usuários `@massa.secureplay.test`, escolas `Escola Massa NN (massa)` e as linhas
dependentes, descobertas pelas FKs do banco), em uma transação: dependentes das turmas, dependentes
dos usuários, turmas, usuários, dependentes das escolas e escolas. Aborta se houver usuário fora da
massa vinculado a uma escola da massa.

## O que é gerado

`empresa`, `usuario`, `turma`, `turma_professor`, `turma_aluno`, `usuario_stats` (todos os alunos;
~70% com XP; com `current_streak` e `last_checkin_date` coerentes), `daily_checkin` (um dia por ponto da
sequência, `streak` 1..N, terminando hoje, ontem ou anteontem; `refill_status` `skipped`), `ranking_season_points` (temporada atual) e `usuario_aula` (aulas ativas já existentes;
sem aulas, é ignorado). Não cria conteúdo. O ranking "total" lê `usuario_stats.total_points`; o da
temporada atual lê Redis enquanto o acompanhamento do ranking não cobre o mês (a massa não grava Redis).

Teste: `node --test scripts/seed-massa.test.cjs`.
