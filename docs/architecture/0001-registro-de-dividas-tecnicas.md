# ADR 0001 - Registro de dividas tecnicas e riscos conhecidos

Status: Aceito (registro). Data: 2026-08-25.

## Context

Ao estruturar o SecurePlay para desenvolvimento assistido por IA, foi feita uma analise do codigo existente (backend NestJS/Fastify + frontend React/Vite). A analise identificou dividas tecnicas e riscos que NAO devem ser corrigidos automaticamente agora, mas precisam ser conhecidos por todos os agentes para evitar propagacao e para orientar correcao futura. Este ADR e a fonte de verdade dessas dividas, referenciada pelos steering files.

## Decision

Registrar as dividas abaixo. Codigo novo NAO deve replica-las. Correcao ocorre quando uma tarefa justificar ou quando explicitamente solicitada, via ADR proprio.

### Riscos de seguranca

1) synchronize:true (backend/src/database/database.providers.ts)
   - Risco alto: altera schema automaticamente conforme entidades; pode causar perda de dados em producao. Nao ha migrations.
   - Direcao: adotar migrations TypeORM e desligar synchronize antes de producao (ADR futuro).

2) WebSocket sem autenticacao no handshake (backend/src/gateway/app.gateway.ts)
   - userId vem de client.handshake.query.userId sem validar JWT. Permite entrar na room user_{id} de outro usuario (IDOR em tempo real).
   - Direcao: autenticar o handshake com o JWT e derivar userId do token validado.

3) auth.service.signOut decodifica token sem checar null antes de acessar decoded.exp.
   - Direcao: validar null antes de calcular TTL.

4) backend/.env versionado
   - Verificar se contem segredos reais. Direcao: usar .env.example e remover segredos do versionamento.

### Inconsistencias arquiteturais

5) jwt.strategy.ts importa o tipo Request de 'express', mas a app roda em Fastify. Funciona por acaso. Direcao: ajustar tipagem.

6) Nome de arquivo com typo: backend/src/database/database.molule.ts (deveria ser database.module.ts). Todos os imports repetem o typo.

7) Stack de UI duplicada no frontend: MUI + Emotion coexistindo com Tailwind v4 + Radix. Padrao oficial e Tailwind + Radix. Direcao: nao usar MUI em codigo novo; planejar remocao.

8) typeorm e @nestjs/typeorm em dependencies do frontend (indevido). Direcao: remover do frontend.

9) frontend/src/server.js e um servidor Fastify orfao (mesma porta do backend). Direcao: confirmar e remover se nao usado.

10) aula-quiz: controller acessa repositorio direto e faz CRUD sem service; nao tem module proprio. question e usuario-aula tambem nao tem module/service proprios. Direcao: nao propagar; padronizar quando tocar nesses dominios.

11) DTO declarado dentro de upload.controller.ts (PresignUploadDto). Direcao: mover para dto/.

12) EventEmitter notification.created em aula.service.verificarModuloConcluido nao passa o campo id (gateway espera id). Direcao: incluir id da notificacao persistida.

13) Coluna "readed" em notification.entity e typo de "read". Direcao: novas colunas de leitura usam is_read; renomear a existente exige migration (avaliar).

14) Redeclaracao do mesmo provider de repositorio (ex.: USUARIO_STATS_REPOSITORY) em varios modulos, criando instancias separadas. Direcao: exportar/importar o provider de um unico modulo.

15) Mistura pt-br/en em rotas, metodos, colunas e chaves. Direcao: convencao para codigo novo em structure.md 2.5; nao renomear dominios existentes sem necessidade.

### Duplicacao

16) Logica de creditar XP + gravar xp-today no Redis duplicada em challenge.service, aula.service e dashboard.service. Direcao: extrair para util/service compartilhado antes de duplicar de novo.

17) PublicRoute e PrivateRoute quase identicos (mesmo validateToken). Direcao: compartilhar hook.

18) useNotification faz getMe manual em vez de useCurrentUser. Direcao: reutilizar useCurrentUser.

### Lacunas

19) Frontend sem runner de teste e sem ESLint proprio. Direcao: adotar Vitest + Testing Library e ESLint (ADR futuro).

20) Observabilidade nao padronizada (logging estruturado, correlation id, metricas). Direcao: definir e registrar em ADR.

## Alternatives

1) Corrigir tudo agora: rejeitado. Violaria o principio de mudanca minima e o escopo desta etapa (infraestrutura, nao features/refatoracao).
2) Ignorar as dividas: rejeitado. Perderia rastreabilidade e permitiria propagacao.

## Consequences

1) Os steering files referenciam este ADR como fonte das dividas.
2) Agentes evitam replicar os padroes problematicos em codigo novo.
3) Cada correcao futura relevante recebe seu proprio ADR.
