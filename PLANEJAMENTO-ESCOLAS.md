# SecurePlay — preparação para comercialização com escolas

Versão inicial: 19/10/2026. Estado: entregas iniciais de E0.1/E0.2 e primeira correção de dependências em E0.5 executadas; demais parcelas permanecem planejadas.

Este roteiro cobre as 18 iniciativas e os 15 achados técnicos da avaliação fornecida pelo proprietário. Os identificadores SP-01 a SP-18 preservam a rastreabilidade com esse relatório; E0 a E10 indicam a ordem de trabalho proposta. São frentes de evolução, não funcionalidades prometidas nem prazos contratados.

## 1. Decisões confirmadas e limites

- O primeiro comprador será a escola.
- Desenvolvimento local e homologação publicada existem; os dados atuais são fictícios e devem ser preservados.
- O proprietário indicou banco separado no `.env` e autorizou sua consulta para preparar os testes. Conferir destino e isolamento antes de conectar/escrever; credenciais não entram em documentos, logs ou commits. Backup/restauração da homologação permanecem desconhecidos.
- O acesso inicial será assistido: criação pela equipe ou solicitação de piloto seguida de liberação. A escolha entre os dois caminhos permanece aberta.
- Pessoas da equipe SecurePlay terão acesso administrativo interno; a escola piloto também terá seu administrador institucional. Reutilizar inicialmente os papéis existentes e validar a amplitude de cada acesso.
- Aulas, quadrinhos e videoaulas estão em produção editorial separada. Este plano não inclui produzir esse conteúdo. Inclui corrigir os mecanismos de acesso, validação e progresso desses formatos.
- Um piloto com participantes reais exige conteúdo mínimo aprovado e condições operacionais e de privacidade verificadas. Dados fictícios permitem ensaiar a jornada, mas não comprovam aprendizagem ou conformidade.
- Cada entrega concreta deve ser pequena, revisável, testada conforme o risco e registrada em commit local com evidências. Push, deploy, merge, mudanças em serviços publicados e operações sobre banco compartilhado exigem autorização específica.
- Preservar identidade visual, pixel art, registros, progresso e alterações anteriores fora do escopo.

## 2. Como vamos trabalhar

Para cada entrega:

1. Explicar o problema, conferir a evidência atual e delimitar o comportamento esperado.
2. Registrar decisões necessárias e consultar o proprietário antes de implementar escolhas de produto ainda abertas. Avançar nas verificações independentes.
3. Inspecionar Git e separar mudanças anteriores. Definir caminhos da entrega, contratos, riscos e recuperação.
4. Implementar uma fatia funcional com teste de comportamento proporcional. Uma etapa ampla pode gerar vários commits, cada um coerente.
5. Validar o diff final, incluindo arquivos novos, e executar build/checks dos módulos afetados. Fazer revisão independente no fechamento intermediário/crítico; auditorias especializadas apenas quando necessárias.
6. Apresentar resultado, evidências, limitações e decisões pendentes. Corrigir achados antes de declarar a fatia concluída.
7. Stage explícito somente dos arquivos da entrega, conferir o staged diff e criar commit local. Registrar o SHA e sua evidência. Não agregar arquivos alheios, segredos, dumps ou configuração local de agentes.
8. Encerrar a entrega com um ponto de discussão. A etapa seguinte começa após alinharmos seu escopo; o roteiro inteiro não dispara uma implementação contínua automática.

Os resultados da avaliação original são históricos: falhas e contagens de testes precisam ser conferidas antes de orientar uma correção. Uma tarefa pode terminar como "já atendida", "corrigida", "depende de ambiente" ou "adiada por decisão", com justificativa. Não refazer componentes existentes sem necessidade.

O documento de produto é versionado. Demandas, steering, registros internos e guias do ecossistema de agentes continuam locais conforme as instruções do projeto. Evidências publicáveis ficam na descrição do commit ou em documentação técnica da entrega; capturas e logs só entram no Git quando necessários e sem identificação pessoal.

## 3. Sequência proposta

Não há estimativa de calendário nesta versão. Cada fatia terá estimativa após a inspeção do código, das dependências e do ambiente. "Grande" significa que será dividida, não um único commit.

| Etapa | Resultado esperado | Iniciativas | Condição de saída |
| --- | --- | --- | --- |
| E0 — Diagnóstico e decisões iniciais | Baseline reproduzível e mapa dos ambientes | SP-01, SP-07; preparação de SP-02 | Sabemos o que pode ser testado sem tocar a homologação e quais falhas já existem |
| E1 — Banco e implantação previsíveis | Schema controlado e recuperação ensaiada | SP-01 | Criação limpa, atualização de cópia e restauração verificadas; plano de aplicação separado |
| E2 — Progresso e recompensas corretos | Finalizações únicas e estados recuperáveis | SP-03; parte de SP-16 | Repetições, concorrência e falhas não duplicam nem perdem efeitos obrigatórios |
| E3 — Entrada, conta, sessão e e-mail | Acesso compreensível e recuperável | SP-04, SP-08, SP-09 | Jornadas de acesso e revogação verificadas, inclusive rejeições e falhas |
| E4 — Administração e isolamento | Equipe interna e escola operam apenas seu escopo | SP-05, SP-06, SP-15 | Matriz de autorização, auditoria e reversão administrativa aprovadas |
| E5 — Preparação para dados infantis reais | Responsabilidades e fluxos de dados definidos | SP-02 | Decisões e validação aplicável concluídas antes do uso infantil real |
| E6 — Captação e piloto assistido | Escola entra, convida e acompanha participantes | SP-10, SP-11; coleta mínima de SP-13 | Jornada completa ensaiada com dados fictícios e pronta para validação com escola |
| E7 — Operação global e contratos | Organização, piloto e situação comercial com significado | SP-12, SP-14 | Operação rotineira pelo painel, acesso contratual com política explícita |
| E8 — Métricas e capacidade operacional | Indicadores confiáveis e diagnóstico de falhas | SP-13, SP-16 | Totais reconciliados, consultas limitadas e falhas acionáveis |
| E9 — Acessibilidade, persistência e descoberta | Uso consistente em teclado, celular e dispositivo compartilhado | SP-17 | Jornadas verificadas nas condições previstas e metadados adequados |
| E10 — Automação e cobrança condicionais | Automatizar necessidades demonstradas | SP-18 | Decisão fundamentada de implementar, adiar ou descartar cada automação |

SP-07 acompanha todas as etapas. E5 começa pela definição de responsabilidades em E0; sua posição na tabela não permite adiar privacidade até depois da coleta real. A instrumentação mínima entra junto de E6, sem esperar E8. Correções de acessibilidade que bloqueiem um fluxo entram na própria entrega, sem esperar E9.

Dependências principais: E0 → E1 → mudanças de persistência de E2/E3/E4; E2 + E3 + E4 + E5 → piloto real de E6; dados de E6 → consolidação de E7/E8; contratos e demanda comprovada → E10. Correções isoladas sem mudança de schema podem avançar após E0 com testes locais. Não é necessário terminar E8/E9/E10 para um piloto seguro, desde que seus requisitos essenciais estejam atendidos.

## 4. Entregas concretas e evidências

### E0 — Estabelecer o ponto de partida

- E0.1: inventariar desenvolvimento, homologação, dependências, configuração não secreta, versão do código e banco utilizado. Verificar se o backend local usa banco próprio ou o banco compartilhado. Não iniciar serviços que possam executar sincronização, agendamentos ou seeds antes disso.
- E0.2: conferir testes/build/lint existentes em ambiente apropriado, classificar falhas anteriores e verificar o E2E com bootstrap Fastify. Verificar vulnerabilidades de dependências quando o registro estiver disponível; separar alerta encontrado de atualização comprovadamente necessária.
- E0.3: definir massa sintética com pelo menos duas escolas, alunos, administradores institucionais e internos, sem apagar os registros atuais. Definir onde rodar MySQL/Redis descartáveis e como limitar integrações de teste. Primeira parcela preparou `compose.test.yaml` e `TESTE-DOCKER.md`; ambiente e massa seguem pendentes até executar Docker em isolamento.
- E0.4: registrar decisões iniciais de entrada assistida, responsabilidade por contas, visibilidade no trial, acessos internos e critério operacional do piloto.
- E0.5: triar os alertas de dependências encontrados na auditoria, distinguindo produção/desenvolvimento e aplicabilidade; preparar atualizações delimitadas com testes em entrega própria. Priorizar alertas altos/críticos antes do marco de piloto real. Tratar também a dívida de lint por fatias, sem desabilitar regras para esconder o baseline.
- Aceite: baseline e lacunas nomeadas; nenhum comando de escrita em homologação; próximos testes reproduzíveis. Corrigir fixtures apenas quando a expectativa continuar provando o comportamento correto.
- Commits previstos: correções delimitadas de testes e bootstrap, se necessárias. Um levantamento sem alteração versionável não exige commit vazio.

### E1 — SP-01: banco, migrations, backup e implantação

- Comparar entidades, migrations e schema observado por inspeção autorizada. O arquivo do Render declara sincronização habilitada; a configuração efetiva publicada ainda precisa de verificação.
- Definir baseline sem reescrever migrations aplicadas. Auditar duplicidades antes de propor restrições de integridade.
- Ensaiar criação do zero, atualização de cópia, backup/restauração e compatibilidade com versões da aplicação. Proteger cópias e não commitá-las.
- Preparar execução explícita de migrations e retirada controlada de sincronização. Não alterar apenas a flag presumindo que o schema está pronto.
- Definir sequência de release: backup → verificação de versão/schema → migration compatível → aplicação → smoke tests → monitoramento. Validar a ordem para cada mudança.
- Aceite: aplicação opera na base restaurada; restrições e dados preservados; rollback ou correção progressiva documentados, incluindo limites de perda de dados.
- Commits previstos: baseline/migrations verificadas; configuração e procedimento de implantação coerentes. Aplicação em homologação é uma ação posterior autorizada e verificada separadamente.

### E2 — SP-03: integridade de atividades e recompensas

- E2.1: desafio diário exige exatamente uma resposta por questão autorizada, IDs únicos, índices inteiros dentro das opções e conjunto completo. Rejeitar entradas inválidas antes de salvar ou premiar.
- E2.2: finalização do desafio e crédito obrigatório ocorrem uma única vez; tratar duplicidades existentes antes de criar restrições. Preservar respostas parciais e impedir sobrescrita tardia da conclusão.
- E2.3: partidas Arcade são finalizadas uma única vez, inclusive com requisições concorrentes e repetidas. A leitura/consumo de tentativas deve ser atômica. A estratégia entre Redis e MySQL precisa permitir recuperação após falha entre os dois sistemas; consumir a partida no Redis, sozinho, não garante a recompensa persistida.
- E2.4: conclusão de aula, XP e bônus de módulo têm concessão única e unidade consistente. Notificações, cache e eventos podem ser repetidos com segurança e recuperados sem premiar novamente.
- E2.5: concessão de moeda virtual persiste lançamento e carteira atomicamente, com concorrência entre origens diferentes e compra existente preservada.
- E2.6: padronizar a fronteira de crédito de XP apenas onde necessário; preservar ranking mensal, elegibilidade e snapshots fechados. Reduzir o acoplamento de cadastro/configuração ao fechamento de temporadas sem perder o congelamento histórico.
- Aceite: zero duplicação ou perda de efeitos obrigatórios nos cenários de repetição, concorrência e falha parcial; conclusão final confirmada pelo servidor; progresso parcial continua retomável.
- Evidências: regressão de entradas inválidas, teste de concorrência com MySQL/Redis quando pertinente, injeção de falhas e reconciliação de progresso/XP/carteira/ranking. Mocks não comprovam atomicidade real.
- Commits previstos: validação do desafio; finalização do desafio; Arcade/tentativas; aula/bônus; carteira; integração de XP, em fatias compatíveis.

### E3 — SP-04, SP-08 e SP-09: acesso e recuperação

- E3.1: rotas públicas, sessão e rotas lazy exibem carregamento, limite de espera, erro e nova tentativa; indisponibilidade não resulta em tela vazia nem em acesso indevido. Verificar a jornada atrás do proxy publicado quando autorizado.
- E3.2: política de sessão explícita para troca de senha, logout, inativação, expiração e revogação; incluir sockets já conectados. Não acrescentar refresh token sem necessidade demonstrada.
- E3.3: recuperação de senha de conta ativa com resposta que não revele existência da conta, limitação de abuso, token protegido de uso único e expiração. Separar recuperação de definição inicial de senha.
- E3.4: reforço administrativo: política de senha, MFA e reautenticação de operações sensíveis, conforme desenho aprovado; testar recuperação para evitar bloquear os proprietários. Não impor o mesmo fluxo às crianças.
- E3.5: entrega de e-mail com estado persistido, tentativas e reprocessamento; confirmar/redefinir/reenvio preservam a jornada após falha. Diferenciar aceitação pelo provedor de entrega confirmada; não registrar sucesso sem evidência correspondente.
- Aceite: entrada e recuperação completas; revogação afeta HTTP e tempo real conforme política; falha do provedor fica visível e recuperável, sem exposição de tokens ou dados pessoais.
- Evidências: testes de expiração, replay, abuso, falha/timeout de envio, sessão e socket; ensaio no navegador; envio real somente para destinatários de teste autorizados.
- Commits previstos: estados de entrada; revogação; recuperação de senha; MFA; entrega/reprocessamento de e-mail. Política compartilhada definida antes dos fluxos dependentes.

### E4 — SP-05, SP-06 e SP-15: administração segura

- E4.1: matriz com aluno, administrador da escola e administrador global, em duas escolas; testar JWT real, CSRF, Redis, persistência, URLs, filtros e IDs de payload. Separar catálogo global de dados privados.
- E4.2: reativação autorizada, proteção do último administrador institucional e auditoria persistida junto de ações críticas. Definir ator, alvo, motivo e campos relevantes, sem copiar payloads sensíveis.
- E4.3: desativação de módulo nega acesso direto às aulas e operações dependentes conforme semântica escolhida. Verificar conteúdo legado antes de restringir.
- E4.4: DTO concreto de atualização de quiz, índices válidos, quantidade/opções consistentes e confirmação de exclusões destrutivas. Não expor respostas corretas na listagem do aluno.
- Aceite: administrador institucional não consulta/administra outra escola; usuário institucional não usa rotas globais; flags desabilitadas são negadas no backend; reversões administrativas autorizadas funcionam e deixam histórico.
- Evidências: E2E negativo e positivo com banco e identidade reais de teste; correções de conteúdo sem alterar arquivos editoriais em andamento; UI em desktop/celular e por teclado quando alterada.
- Commits previstos: cobertura/correções de isolamento; reativação/auditoria; disponibilidade do conteúdo; validação de questões.

### E5 — SP-02: condições para participantes reais

- Mapear dados, finalidades, responsáveis, acessos, operadores, retenção, exclusão/exportação e resposta a incidentes/solicitações. Identificar contato do controlador e responsabilidades de escola/plataforma/responsável conforme avaliação aplicável.
- Decidir quem cria contas de alunos e quais dados são necessários; revisar necessidade de nascimento, e-mail próprio, apelido, imagem e ranking. Teste coletivo não equivale a escola isolada.
- Definir tratamento de solicitações de responsáveis/escola, prazos e execução operacional; adaptar avisos e termos ao fluxo implementado. Não considerar um checkbox suficiente para resolver o desenho.
- Consultar fontes oficiais atuais e obter avaliação jurídica pertinente antes de afirmar adequação às regras do público infantil. Este roteiro não declara conformidade jurídica.
- Aceite: matriz de dados e responsabilidades aprovada; fluxos testados; minimização aplicada; papéis e avisos correspondem à operação; nenhuma restrição nova bloqueia retroativamente contas antigas sem decisão explícita.
- Commits previstos: adaptações de cadastro/convite; controles de dados e atendimento; textos públicos revisados. Conteúdo jurídico depende da validação indicada.

### E6 — SP-10, SP-11 e início de SP-13: escola interessada até piloto

- E6.1: escolher entre criação assistida direta e formulário de solicitação. Se houver formulário: contato adulto, escola e objetivo, finalidade clara, antispam e persistência anterior a qualquer automação.
- E6.2: lead com origem, etapa, interações e próximo passo; deduplicação por e-mail normalizado e contexto, sem inferir escola por domínio nem transformar aluno em lead.
- E6.3: piloto vinculado à organização própria, contato adulto, datas, objetivo e estado. Criar/liberar organização após qualificação, sem criação automática por cada formulário.
- E6.4: administrador institucional acessa, convida participantes e acompanha a primeira conclusão. Reutilizar administração e convites existentes. Turmas/matrículas e novo papel de professor só se requisito concreto exigir.
- E6.5: definir início e extensão do piloto/trial, fim, preservação do histórico e próximo contato. Avaliar se o teste individual de sete dias continua como demonstração distinta, se muda ou se é retirado; não convertê-lo silenciosamente em piloto escolar.
- E6.6: instrumentar marcos/eventos mínimos com versão, horário, contexto autorizado e deduplicação; definir retenção e evitar dados sensíveis no payload analítico.
- E6.7: antes do piloto real, definir responsável e canal de suporte para a escola, registro mínimo de solicitações, encaminhamento de falhas de acesso e procedimento de incidente. Ensaiar um pedido de ajuda e sua resolução; não depende de criar módulo de atendimento.
- Aceite técnico: adulto solicita/é cadastrado → equipe acompanha → escola acessa → convida → aluno conclui atividade sintética → escola vê participação → encerramento tem próximo passo. Conteúdo real e avaliação pedagógica são dependências para o piloto real, fora da produção desta etapa.
- Commits previstos: captação; acompanhamento; piloto/entrada institucional; relatório mínimo e marcos. Eventos entram junto do fluxo correspondente.

### E7 — SP-12 e SP-14: operação global e acordos

- Evoluir o painel existente por responsabilidade: visão geral, organizações, interessados/pilotos, acessos internos, auditoria e operação. Comercial cresce quando seus dados existirem. Usar componentes/tokens existentes, sem reconstrução visual ampla.
- Ficha da escola: contatos adultos, classificação, estado operacional separado do comercial, usuários, convites, funcionalidades, atividade agregada, piloto/acordo, histórico e próxima ação.
- Definir permissões internas conforme as pessoas e tarefas reais; evitar conceder acesso global amplo por conveniência. Proprietário, operação e consulta são possibilidades a justificar, não novos papéis automáticos.
- Acordo comercial inicial manual: vigência, condição e referência externa, política de extensão, suspensão e recuperação. Definir preço/unidade antes de modelar plano e limites; acesso não depende de uma inferência de pagamento.
- Exportações têm finalidade, campos mínimos e autorização própria. Não exportar dados infantis em relatórios comerciais por padrão. Atendimento pode começar com histórico de contato; casos de suporte separados apenas quando houver necessidade.
- Aceite: tarefas rotineiras sem intervenção no banco, ações críticas com contexto/motivo/auditoria, situação comercial não confundida com habilitação técnica. Piloto convertido preserva vínculos e histórico.
- Commits previstos: ficha consolidada; visão global; acordos/direitos de uso; ações operacionais e filtros necessários.

### E8 — SP-13 e SP-16: métricas, desempenho e operação

- Definir dicionário de indicadores: significado, fonte, denominador, coorte/período, filtros, dono da decisão e limitações. Dados desconhecidos aparecem indisponíveis, sem inventar datas históricas.
- Cobrir: organizações elegíveis, novas organizações, contas habilitadas por papel, trials vigentes, convites válidos, conclusões, última atividade conhecida, onboarding, ativação/conversão de pilotos, organizações com uso e leads sem próximo passo.
- Receita recorrente e churn só após fonte contratual e definição de cliente; avaliar se servem ao modelo escolhido. Não confundir empresa com cliente, conta habilitada com uso, convite com ativação, XP com aprendizagem ou valor contratual com caixa recebido.
- Reconciliar eventos com operações persistidas; excluir contas técnicas/testes conforme a consulta; registrar limites de histórico disponível. Indicadores pedagógicos dependem de objetivos e conteúdo definidos em trilha própria.
- Paginar/agregar ranking e listagens no banco com campos e índices adequados; medir consultas antes/depois. Preservar elegibilidade, classificação e histórico congelado.
- Separar administração em responsabilidades sem refatoração geral. Padronizar fronteiras de XP e reduzir efeitos de fechamento de temporada ainda pendentes de E2.
- Diferenciar saúde do processo de prontidão de dependências; logs correlacionáveis sem segredos; alertas externos acionáveis e acompanhamento de falhas de e-mail/integrações. Diagnóstico sensível não é exposto em health público.
- Aceite: totais conferem com consultas de referência, duplicação não altera conversão, consultas têm trabalho limitado e falhas são identificáveis. Monitoramento não substitui testes de restauração.
- Commits previstos: definições/agregações; painel com indicadores existentes; consultas; diagnóstico e alertas; refatorações delimitadas com contrato preservado.

### E9 — SP-17: acessibilidade, jogo local e SEO

- Corrigir semântica de diálogo, contenção/restauração de foco, navegação por teclado, labels e foco visível; estados de rota e movimento reduzido; verificar contraste nas paletas suportadas.
- Validar telas afetadas em desktop e larguras de 320/390 px, overflow, cortes e controles. Preservar identidade/pixel art e progressos salvos.
- Persistência de Palavra Secreta/TermoTech por usuário: alternar contas no mesmo dispositivo não reaproveita indevidamente a partida. Definir migração segura de chaves legadas e informar persistência local.
- Metadados, títulos e indexação apropriada da landing; avaliar pré-renderização com medida do problema antes de adicionar infraestrutura. Remover ou identificar componentes órfãos com estatísticas/depoimentos fictícios se ainda existirem, sem apresentar prova social inventada.
- Aceite: jornadas críticas completas por teclado e celular; teste com leitor de tela/dispositivo real explicitamente registrado quando executado; troca de usuário preserva isolamento; rastreabilidade dos limites não testados.
- Commits previstos: modal/foco; movimento/estados e contraste; jogo local; metadados e limpeza pertinente. Reaproveitar evidências de correções já feitas em outras etapas.

### E10 — SP-18: decisões condicionais

- Avaliar cobrança automática somente com modelo comercial, processo manual e necessidade comprovados. Se adotada: provedor escolhido, portal, verificação de origem, eventos persistidos, idempotência, reconciliação, falha/repetição/ordem trocada e recuperação de acesso.
- n8n ou outra automação pode avisar sobre lead ou pendência após persistência no produto. Automação desligada não perde lead nem controla a autorização essencial.
- Registrar custo/benefício e decisão para cada automação; suporte estruturado, CRM externo complexo, data warehouse, impersonação, banco por escola e usuário multi-organização dependem de necessidade demonstrada.
- Não migrar hospedagem por aparência ou preferência de ferramenta. Se houver problema mensurado, abrir avaliação específica.
- Aceite: decisão explícita e rastreável. Adiar é um resultado válido; implementação só começa quando critérios e autorização correspondentes existirem.

## 5. Matriz de cobertura do relatório

| Iniciativa original | Cobertura neste roteiro | Achados/áreas relacionados |
| --- | --- | --- |
| SP-01 — Deploy/schema | E0, E1 | T06; backup, migrations e restauração |
| SP-02 — Governança infantil | E0, E5; critérios de E6/E7 | Dados, entrada por adulto, privacidade e responsabilidades |
| SP-03 — Integridade | E2 | T01, T02, T03, T04, T05 |
| SP-04 — Acesso administrativo | E3 | T07, T08; recuperação administrativa e sockets |
| SP-05 — Isolamento | E4 | T15; duas escolas, autenticação real e testes negativos |
| SP-06 — Auditoria/recuperação | E4, E7 | T09; reativação, último administrador e ações críticas |
| SP-07 — Qualidade das verificações | E0 e fechamento de todas as entregas | Fixtures, E2E, lint, dependências e checks reproduzíveis |
| SP-08 — Entrada e recuperação | E3 | Tela vazia, sessão, senha e indisponibilidade |
| SP-09 — E-mail recuperável | E3 | T10; estado, reenvio e reprocessamento |
| SP-10 — Captação comercial | E6 | Landing, lead adulto, interações e próximo passo |
| SP-11 — Piloto/educador | E6 | Organização própria, marcos, convite e participação |
| SP-12 — Painel global | E7 | Ficha, navegação, filtros, ações e permissões |
| SP-13 — Funil/atividade | E6 para coleta, E8 para consolidação | Eventos, privacidade, indicadores e reconciliação |
| SP-14 — Acordos/limites | E7 | Estados, vigência, unidade de venda e direitos de acesso |
| SP-15 — Conteúdo/DTOs | E4 | T11, T12; mecanismos técnicos, sem produção editorial |
| SP-16 — Acoplamento/operação | E2, E8 | T13, T14; XP/ranking, consultas, admin e dependências |
| SP-17 — Acessibilidade/local/SEO | E3/E4/E6 nas jornadas; consolidação em E9 | Modal, rotas, motion, contraste, jogo e landing |
| SP-18 — Cobrança/automações | E10 | Webhooks/portal condicionais, n8n periférico |

As seções de inventário, maturidade e funcionalidades da avaliação são o ponto de partida a reconferir em E0, não uma instrução para reconstruir o sistema. O modelo de dados proposto é candidato: Lead/LeadInteraction/Pilot em E6; acordos em E7; marcos/eventos em E6/E8; entrega de e-mail em E3; evolução da auditoria em E4. Reutilizar estruturas existentes antes de criar entidades. Turmas, planos, assinaturas e suporte permanecem condicionais.

Referências de mercado do relatório servem como princípios: etapas comerciais simples, marcos de onboarding, relatórios úteis, permissões e auditoria. Fontes e documentação técnica/jurídica devem ser atualizadas na etapa correspondente; o roteiro não certifica as conclusões externas do relatório original.

## 6. Critérios para avançar entre marcos

| Marco | Exigências |
| --- | --- |
| Pronto para desenvolvimento seguro | Ambientes separados, destino dos comandos conhecido e dados atuais protegidos |
| Núcleo confiável em teste | Respostas inválidas rejeitadas; repetição/concorrência/falha preservam estado, XP e saldo; schema/restauração verificados |
| Pronto para piloto com pessoas reais | Acesso/recuperação/e-mail, isolamento, auditoria crítica, governança, conteúdo mínimo aprovado, acompanhamento escolar e procedimento de suporte; validação apropriada do ambiente alvo |
| Pronto para contratação assistida | Condições comerciais explícitas, responsável adulto, vigência/acesso e histórico preservados; regras de privacidade e atendimento aplicáveis verificadas |
| Pronto para ampliar operação | Métricas reconciliadas, observabilidade, consultas proporcionais, recuperação ensaiada e UX sem bloqueios conhecidos nos fluxos essenciais |

Homologação aprovada não equivale a produção aprovada. Validar configuração efetiva e jornada do ambiente alvo antes de qualquer promoção autorizada.

## 7. Padrão de evidência e commit

Cada entrega deve permitir responder: o que falhava/faltava; qual comportamento mudou; em quais arquivos; como foi verificado; em qual ambiente; o que não foi verificado; como recuperar; qual commit contém a mudança.

- Backend: Jest direcionado à regra, build e lint pertinente; concorrência/transação com infraestrutura real descartável quando exigidas. E2E usa bootstrap compatível com Fastify.
- Frontend: build (inclui assets e tipos), lint pertinente e scripts existentes do proxy, parâmetros ou dicionário quando afetados; navegador em desktop/mobile/teclado para UI alterada.
- Banco: migration do zero e sobre cópia, preservação, restrições e restauração; reversão avaliada com perda explícita quando inevitável. Reinício do Redis não pode eliminar dados que precisam ser permanentes.
- Segurança: permissões positivas/negativas, tenant, sessão, CSRF, revogação e dados mínimos conforme o fluxo.
- Ambiente: distinguir teste isolado, ensaio integrado, observação no navegador, homologação, deploy e produção. Um resultado não substitui outro.
- Git: conferir status/diff, arquivos novos e staged; stage explícito. Resultados válidos podem ser reutilizados enquanto código, dependências e ambiente pertinentes não mudarem.

Formato sugerido para descrição de commit:

```text
fix(desafio): rejeita respostas repetidas antes da pontuacao

Problema: ...
Comportamento: ...
Evidencias: comandos/cenarios executados e resultados resumidos.
Limites: verificacoes pendentes e ambiente ainda nao validado.
Recuperacao: estrategia pertinente; omitir se nao se aplicar.
```

Não declarar "testado" genericamente. `git diff --check` só verifica whitespace. Falha anterior não é atribuída à entrega sem evidência; falha nova relevante impede seu fechamento. Uma entrega dependente de validação de ambiente pode ter código commitado com limite explícito, mas continua pendente desse aceite e não libera o próximo marco de uso real.

## 8. Perguntas por momento de decisão

| Momento | Perguntas que precisam de resposta |
| --- | --- |
| Antes de E0/E1 escrever em infraestrutura | Conferir o banco separado indicado no `.env` (consulta autorizada), seu isolamento e onde ficam MySQL/Redis. Há backup e restauração já testados? Quais integrações estão efetivamente funcionando? |
| Antes de E3/E4 definir política | Quem da equipe precisa consultar ou alterar escolas? Quantos administradores iniciais? Qual método de MFA e recuperação é viável? Qual efeito esperado de revogação/inativação? |
| Antes de E5/E6 | Quem cria contas infantis? E-mail de aluno é necessário? Escola, responsável ou ambos autorizam/acompanham? Qual visibilidade do trial e ranking? |
| Antes de E6 desenhar a entrada | Criação direta ou formulário para adulto? Existe acompanhamento comercial externo? O piloto precisa de turmas? Qual duração e qual primeiro resultado o educador deve observar? Quem atende a escola, por qual canal e como encaminha falhas/incidentes? |
| Antes de E7 | Venda por escola, aluno, turma, período ou projeto? Quais condições, limites, extensão e suspensão? O atendimento mínimo do piloto precisa evoluir? |
| Antes do piloto real | Há conteúdo mínimo aprovado e objetivos de aprendizagem definidos? Quem valida os resultados pedagógicos e as condições jurídicas/operacionais? |
| Antes de E8/E10 | Quais decisões cada indicador deve apoiar? Que trabalho manual se repete e justifica automação? Qual forma de cobrança e volume esperado? |

Só perguntas do próximo trecho serão trazidas ao proprietário a cada vez. Escolhas futuras permanecem abertas, sem bloquear correções técnicas independentes.

## 9. Estado atual

- E0 iniciada por autorização do proprietário. Primeira entrega: E0.1/E0.2, com inspeção segura dos ambientes, baseline e duas correções de testes; evidências abaixo.
- Nenhuma iniciativa SP-01 a SP-18 está marcada como concluída por este documento.
- Conferências pontuais anteriores sustentam os riscos de validação do desafio, sincronização declarada no Render e ausência de conteúdo enquanto a sessão carrega; não constituem reprodução integral nem validação do ambiente publicado.
- E0.5 recebeu a primeira correção delimitada de dependências críticas, conforme seção 11. Alertas altos/moderados e dívida de lint continuam pendentes.
- E0.3: preparação versionada em `compose.test.yaml` e `TESTE-DOCKER.md`; serviços ativos após instalação de Docker Desktop/WSL, conforme seção 13. As 13 migrations foram aplicadas somente no banco descartável do Docker (seção 14), com catálogo fictício; o smoke mínimo dos providers MySQL/Redis passou sem importar AppModule (seção 15). Nenhuma escola ou conta de usuário foi criada. AppModule, massa sintética de duas escolas e política de egress continuam pendentes. E0.4 mantém decisões de produto abertas. Não aplicar migrations na base preservada antes de E1.

## 10. Evidências da primeira entrega de E0 — 19/10/2026

### Alterações efetivas

- A fixture HTTP de parâmetros passou a representar o tracking do ranking iniciado no dia do teste, sem temporadas anteriores completas. Isso permite executar a dependência real de fechamento sem mascarar consultas desconhecidas. Foram preservados os testes de permissão, rejeição de payload e isolamento por escola.
- O teste de saúde foi atualizado de Express/contrato antigo para Fastify e a resposta atual `{ status: 'ok' }`, em `/` e `/health`, sem sessão. Importa somente controller e guard reais com Redis simulado; não importa AppModule nem inicializa banco, seeds, agendamentos ou serviços externos.
- Esse smoke HTTP é isolado. O comando `test:e2e` ainda não representa um E2E completo com JWT, CSRF, Redis e MySQL reais; essa validação permanece em E4.
- Nenhuma regra de negócio, configuração de ambiente, dependência ou dado de usuário foi alterado nesta entrega.

### Verificações locais

| Verificação | Resultado observado |
| --- | --- |
| `npm --prefix backend test -- --runInBand`, antes da correção | 44 suítes passaram e 1 falhou; 226 testes passaram e 3 falharam por `dataSource.query` ausente na fixture |
| Mesmo comando, após a correção | 45 suítes e 229 testes aprovados |
| Jest direcionado a parâmetros HTTP e histórico de ranking | 2 suítes, 17 testes aprovados |
| `npm --prefix backend run test:e2e -- --runInBand` | Smoke isolado de saúde: 1 suíte, 2 testes aprovados |
| `npm --prefix backend run build` | Aprovado |
| `npm --prefix frontend run build` | Assets, tipos e build aprovados |
| `npm --prefix frontend run test:api-proxy` | 10 testes aprovados |
| `npm --prefix frontend run test:company-parameters` | 15 verificações aprovadas |
| `npm --prefix frontend run test:termotech-dictionary` | 20.409 palavras verificadas |
| Lint completo do frontend | Baseline pendente: 1 erro e 84 avisos; erro de tamanho em Admin.tsx |
| Lint completo do backend | Baseline pendente: 918 erros e 121 avisos; sem limpeza global nesta entrega |
| Lint dos arquivos de teste alterados comparado ao HEAD inicial | Fixture permanece com 18 erros e 4 avisos anteriores; smoke permanece sem erros/avisos. Nenhum novo diagnóstico por regra |

Runtime local observado: Node 20.20.2/npm 10.8.2. O Dockerfile usa Node 22; execução em container/Node 22 não foi validada. Os testes também emitiram aviso de suporte futuro do AWS SDK; alinhar o runtime integra o preparo do ambiente descartável.

### Ambiente e banco, sem credenciais

- `.env` consultado com autorização, sem carregá-lo no processo da aplicação: MySQL aponta loopback e sincronização explícita está habilitada. Redis aponta endereço externo; não houve conexão a ele. Credenciais de e-mail/armazenamento presentes não comprovam funcionamento das integrações.
- Consulta direta ao MySQL em transação somente de leitura: conexão aprovada, versão 8.0.44, banco selecionado corresponde à configuração, 31 tabelas e nenhuma tabela de histórico de migrations. A ausência do histórico não prova que o schema esteja incorreto, mas exige reconciliação antes de aplicar migrations.
- Naquela etapa, o repositório possuía 13 migrations com prefixo numérico e nenhuma havia sido executada. A aplicação completa não foi iniciada, evitando sincronização e rotinas de startup sobre a base preservada.
- O proprietário informou que o MySQL da homologação está no Aiven. Backup/restauração, configuração efetiva publicada e isolamento do Redis ainda não verificados. Nenhum painel do provedor foi acessado. Loopback não demonstra, sozinho, toda a independência entre ambientes.

### Auditoria de dependências

A consulta ao registro npm foi expressamente autorizada pelo proprietário. Nenhum pacote foi instalado/atualizado e nenhum `audit fix` foi executado. Os números abaixo são entradas de pacotes sinalizadas pelo registro na árvore de dependências; não equivalem a falhas exploráveis confirmadas na aplicação.

| Escopo da consulta | Baixa | Moderada | Alta | Crítica | Total |
| --- | --- | --- | --- | --- | --- |
| Backend completo | 2 | 11 | 23 | 2 | 38 |
| Backend com `--omit=dev` | 1 | 3 | 16 | 1 | 21 |
| Frontend completo | 1 | 2 | 15 | 1 | 19 |
| Frontend com `--omit=dev` | 0 | 1 | 7 | 0 | 8 |

O crítico restante no backend com `--omit=dev` aponta `proxy-addr`, instalado pela cadeia de Express; o bootstrap observado usa Fastify. A aplicabilidade e a atualização compatível precisam de triagem, sem presumir exploração nem ignorar o alerta. No frontend estático, `--omit=dev` também não demonstra que cada pacote faça parte do JavaScript entregue ao navegador. Esses resultados abrem E0.5 e não encerram auditoria de segurança.

### Limites e recuperação

Sem validação visual/autenticada, envio real de e-mail, conexão Redis/S3, migrations, restauração, deploy ou mudança em homologação. Dados fictícios preservados. Recuperação desta entrega consiste em reverter somente as alterações dos testes e deste roteiro em novo commit, se necessário; não há alteração de schema a reverter.


## 11. E0.5 — primeira correção de dependências — 19/10/2026

### Escopo e aplicabilidade

Foram atualizadas somente três resoluções transitivas, sem modificar os manifests, versões principais, código da aplicação ou configurações de serviços:

| Pacote | Antes → depois | Caminho e superfície observada |
| --- | --- | --- |
| proxy-addr | 2.0.7 → 2.0.8 | Backend: platform-express → Express. Instalado como dependência de produção; bootstrap usa Fastify e a exploração não foi demonstrada |
| handlebars | 4.7.9 → 4.7.10 | Backend: ts-jest; ferramenta de testes, não dependência de produção |
| tar | 7.5.7 → 7.5.22 | Frontend: Tailwind/oxide; ferramenta de build, não evidência de exposição no navegador |

As versões corrigidas foram conferidas nos avisos de [proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [Handlebars](https://github.com/advisories/GHSA-p8wg-vrv2-v86f) e nos alertas de [tar](https://github.com/advisories/GHSA-23hp-3jrh-7fpw), incluindo os demais avisos retornados pelo npm. A árvore instalada foi conferida com npm ls. A atualização respeita as faixas já declaradas pelos pacotes que os utilizam; não adiciona overrides.

O npm também completou seis registros de metadados de dependências já embarcadas na variante opcional WASI de Tailwind/oxide 4.1.12 no lockfile do frontend. Esse pacote e suas declarações de dependências não mudaram de versão; nenhuma outra resolução existente mudou. Foram preservados os metadados gerados pelo gerenciador.

### Evidências após a atualização

- Instalação local com ignore-scripts, sem audit fix. Somente dois pacotes alterados no backend e um no frontend. Nenhum script de instalação executado.
- Backend: 45 suítes/229 testes aprovados; smoke Fastify de saúde: 1 suíte/2 testes aprovados; build aprovado.
- Frontend: assets, tipos e build aprovados; proxy com 10 testes, parâmetros/cache com 15 verificações e dicionário com 20.409 palavras aprovados.
- Nenhum arquivo de código/configuração de lint ou pacote de lint mudou: baseline de lint da seção 10 permanece pendente e não foi reexecutado nesta entrega de lockfiles.
- Runtime desta validação: Node 20.20.2. Paridade com Node 22/container continua pendente. Sem validação visual ou E2E autenticado com serviços reais.

Nova consulta npm audit autorizada, no mesmo dia:

| Árvore | Baixa | Moderada | Alta | Crítica | Total |
| --- | --- | --- | --- | --- | --- |
| Backend completo | 2 | 11 | 23 | 0 | 36 |
| Backend omitindo dev | 1 | 3 | 16 | 0 | 20 |
| Frontend completo | 1 | 2 | 15 | 0 | 18 |
| Frontend omitindo dev | 0 | 1 | 7 | 0 | 8 |

As entradas críticas passaram de 2 para 0 no backend completo e de 1 para 0 no frontend completo. Essas contagens são do registro e não certificam segurança ou explorabilidade. Os alertas restantes exigem triagem/atualizações por fatias antes do marco de piloto real; E0.5 não está encerrada.

### Continuidade e recuperação

Dados, schema, .env e homologação permanecem preservados. Recuperação: reverter esta entrega em novo commit e reinstalar as dependências a partir dos locks anteriores no ambiente de desenvolvimento. Não há alteração de banco a reverter.

O proprietário escolheu Docker para o ambiente descartável de E0.3. A primeira preparação registrou somente a configuração, sem serviço iniciado. O estado do ensaio do Desktop e dos containers está na seção 13. Massa exclusivamente sintética de duas escolas e proteção do `.env` continuam pendentes. Backup/restauração do Aiven continua em E1.


## 12. E0.3 — preparação inicial do ambiente descartável — 19/10/2026

- `compose.test.yaml` define apenas MySQL 8.0.44 e Redis 7.4-alpine. O volume MySQL usa nome do projeto; Redis não persiste. Bridge dedicada; portas em loopback 13306/16379. Sem backend, `.env`, migrações, seeds, e-mail ou storage.
- `TESTE-DOCKER.md` documenta pré-requisitos, comandos, saúde dos serviços, preservação ou remoção exclusivamente do volume desse projeto e limites de dados/credenciais. Credenciais fixas ali são públicas e servem apenas para desenvolvimento descartável.
- Preflight antes da instalação feita pelo proprietário: Docker CLI ausente; `wsl --version` indicava ausência da configuração WSL naquela tentativa. Estado posterior, com versão/kernel, engine e containers, registrado na seção 13.
- A configuração foi corrigida durante o primeiro ensaio: `internal: true` impedia que o Docker publicasse as portas no host. A bridge dedicada permite os mapeamentos explícitos em `127.0.0.1`, porém permite egress do container.
- Os containers passaram healthchecks e foram testados por loopback, sem backend ou `.env`. Não há massa sintética. Antes de adicionar/iniciar backend, definir processo para impedir leitura do `.env` comum e limitar egress; então criar massa sintética.


### Ensaio inicial após instalação Docker — 19/10/2026

- Verificados Docker CLI 29.9.1, Compose 5.6.0 e WSL versão padrão 2. O desktop-linux estava parado. Execução normal não conseguiu ler WSL/Docker; consulta elevada confirmou WSL sem distros listadas e engine parado. Abrir o executável encontrado do Docker Desktop levou o engine a `starting` e depois `Server 29.9.1`, com processo backend e `vmmemWSL`.
- `docker compose -f compose.test.yaml config --quiet` passou. O primeiro `up --wait` iniciou imagens oficiais mysql:8.0.44 e redis:7.4-alpine; ambos ficaram healthy.
- A primeira inspeção encontrou nenhum port publicado apesar do YAML conter `127.0.0.1`: `internal: true` impedia publicação efetiva na configuração em teste. Portas não alcançáveis. O volume novo era `secureplay-e0-003_mysql-data`, local, sem tabelas/dados; Redis DB size 0. Nenhum dado anterior tocado.
- Correção para bridge dedicada com portas ainda restritas a loopback. Removido `internal: true`; documentado que bridges comuns permitem egress e que qualquer backend só poderá ser incluído com `.env` substituído e política explícita de saída. Recriar containers preserva volume do projeto.
- Registro do primeiro ensaio antes da correção: a nova configuração ainda precisava ser aplicada e revalidada. A conclusão do segundo ensaio consta na seção 13. Não executar backend, migrations, seeds nem criar alunos nesta parcela.


## 13. E0.3 — ensaio do Docker Desktop e serviços — 19/10/2026

- O proprietário informou que instalou Docker e WSL. Verificações: CLI 29.9.1, Compose 5.6.0, WSL padrão 2/kernel 6.1.54. O Desktop estava parado. Consulta elevada confirmou WSL sem distribuições listadas e engine parado. Abrir o aplicativo instalado iniciou backend, `vmmemWSL` e o engine Linux Server 29.9.1.
- `docker compose config --quiet` aprovado. `up --wait` baixou imagens oficiais MySQL 8.0.44/Redis 7.4-alpine e confirmou ambos `healthy`.
- A rede `internal: true` impedia publicação: `docker port` sem portas e conexão host em loopback falhou. A mudança para bridge dedicada corrigiu mapeamentos. Recriar serviços preservou o volume `secureplay-e0-003_mysql-data`; não foi executado `down --volumes`.
- Estado ao final do ensaio inicial dos containers e antes das migrations da seção 14: portas loopback 127.0.0.1:13306/16379 alcançáveis; MySQL devolveu 8.0.44, `secureplay_test` e zero tabelas via SELECT; Redis PONG/DBSIZE 0; bridge Internal=false; volume Scope=local. Os containers permaneceram ativos.
- Estado naquele primeiro ensaio: a bridge permite egress. Somente serviços DB/Redis oficiais rodam sem credenciais de provedores da aplicação; backend, `.env`, migrations, seeds e contas sintéticas ainda não tinham sido iniciados. A etapa posterior de migrations consta na seção 14. Para executar AppModule, desenhar egress e fornecer env exclusivo antes de execução.


## 14. E0.3 — migrations no banco Docker descartável — 19/10/2026

- Antes da escrita: Compose identificou MySQL/Redis ativos e saudáveis, portas limitadas a loopback e volume `secureplay-e0-003_mysql-data` local. Consulta somente de metadados confirmou MySQL 8.0.44 e zero tabelas no database `secureplay_test`.
- `migration:show` apontou 13 migrations pendentes. A execução ocorreu na pasta `backend`, com variáveis temporárias explícitas para `127.0.0.1:13306`, usuário/database de teste declarados no Compose, `DB_SSL=false` e `DB_SYNCHRONIZE=false`. O comando não incluiu `--env-file`, não carregou `.env` e usou `migration-data-source.ts`, que mantém sincronização e execução automática desligadas. O guia agora fixa e valida o destino no próprio bloco de PowerShell, restaurando as variáveis anteriores ao terminar.
- TypeORM reportou 13 migrations executadas. Verificação SQL somente de leitura confirmou 13 entradas em `migrations`, 32 tabelas, 6 módulos e 42 aulas do catálogo inicial; `empresa` e `usuario` seguem com zero linhas. Nenhum backend/AppModule, Redis de aplicação, migration na Aiven, escola ou usuário foi inicializado.
- A migration `SeedCatalog` preenche conteúdo fictício e declara `down()` não reversível. Os dados pertencem ao ambiente descartável; para retorno completo ao estado vazio, `docker compose -f compose.test.yaml down --volumes` remove esse volume e apaga o schema/catálogo deste Compose. Esse comando não foi executado.
- Próxima fatia após o smoke dos providers: planejar e criar massa sintética de duas escolas. Definir controle de egress antes de iniciar AppModule ou qualquer aplicação que possa chamar provedores externos.


## 15. E0.3 — smoke dos providers MySQL/Redis — 19/10/2026

- Criado `backend/scripts/smoke-docker-services.cjs`, usando `createDatabaseDataSource` e `RedisService` reais sem importar `AppModule`. O script aborta se variáveis herdadas divergirem do destino Docker de teste ou se existirem URLs/credenciais herdadas de serviços externos; não carrega `.env`.
- Proteções verificadas antes das conexões: MySQL host/porta/database de teste, `DB_SSL=false`, `DB_SYNCHRONIZE=false`, `synchronize=false` e `migrationsRun=false` no DataSource; Redis host/porta local, TLS desligado e sem URL/usuário/senha alternativos.
- Execução `node -r ts-node/register scripts/smoke-docker-services.cjs` na pasta `backend`: aprovada. Resultado: MySQL 8.0.44/database `secureplay_test` com 13 migrations; Redis executou SET/GET/DEL com chave aleatória e TTL de 60s. O fluxo apaga a chave e mantém TTL como limpeza secundária.
- Nenhum usuário, empresa ou escola foi criado. Nenhum AppModule, controller, servidor HTTP, e-mail, S3 ou provedor externo foi iniciado. Conectividade local aprovada não valida tenant, API autenticada, fluxo escolar ou isolamento de egress do AppModule.


## 16. E0.3 — cópia da base fictícia local para Docker — 19/10/2026

- O proprietário esclareceu que já mantém dados fictícios no MySQL local e pediu a cópia para o ambiente Docker; essa orientação substitui a proposta anterior de criar contas sintéticas. A cópia preservou as contas existentes; em etapa posterior, a senha de um admin foi redefinida somente na cópia, conforme autorização.
- A origem configurada localmente foi validada como loopback, MySQL 8.0.44, `DB_SYNCHRONIZE=true`. A leitura foi feita em transação `READ ONLY`; 31 tabelas, todas InnoDB, totalizaram 520 registros. Não foram consultados campos individuais. Não havia views, triggers, rotinas ou eventos.
- Dump lógico de snapshot consistente foi criado temporariamente fora do repositório e importado no novo database `secureplay_fixture_copy` do MySQL Compose. Dump local e cópia temporária no container removidos após a validação; nenhum dado, senha ou dump foi versionado.
- Verificação exata: nomes das 31 tabelas e contagens individuais coincidem; totais 520/520. A origem não foi alterada. O database preexistente `secureplay_test` continua separado: 32 tabelas, 13 migrations e nenhuma linha em `empresa` ou `usuario`.
- Comparação sem escrita com `createDatabaseDataSource`, `synchronize=false` e `migrationsRun=false`: conexão no database clonado, 30 entidades carregadas e zero consultas pendentes do schema builder. A tabela adicional `achievement_connection` só aparece nas migrations, sem entidade TypeORM. Esse resultado não cria histórico nem substitui validação de migrations.
- `NestFactory.createApplicationContext(AppModule)` iniciou e fechou com cwd temporário sem `.env`, MySQL `secureplay_fixture_copy`, Redis loopback, sem credenciais S3/e-mail, `synchronize=false` e `migrationsRun=false`; não abriu listener HTTP. Um segundo ensaio com Fastify `inject` no AppModule real retornou `/health`=200 e `/home` sem sessão=401, sem listener de rede. Checksums das 31 tabelas da origem e da cópia continuaram idênticos depois dos hooks. Os fluxos externos não foram chamados, mas o processo host não teve bloqueio geral de egress. No harness foi necessário destruir explicitamente o DataSource após `app.close()`; shutdown HTTP segue não validado.
- Node 20.20.2 emitiu o aviso de suporte futuro do AWS SDK; compatibilidade no Node 22 do Dockerfile não foi revalidada nesta execução.
- O AppModule foi carregado somente em `ApplicationContext` e ensaio Fastify in-process; `main.ts`/servidor não foi iniciado. A cópia é fiel ao schema local, sem tabela `migrations`; não habilitar sincronização/migrations. `down --volumes` elimina tanto `secureplay_test` como `secureplay_fixture_copy`.
- Login autenticado concluído na cópia com o admin da empresa 1: `POST /auth/login`=200, cookie emitido e `GET /auth/me`=200 com `role=admin`, `empresa_id=1`. A senha foi redefinida somente no clone, por prompt mascarado; texto e hash não foram registrados.
- Comparação posterior somente de leitura: os nomes das 31 tabelas e as 520 linhas coincidem com a origem; todo o conteúdo coincide exceto `usuario.password`, incluindo os demais campos do admin. Hash do admin diferente confirmado. A origem não foi alterada.
- Limites: nenhum listener HTTP aberto; e-mail/S3 não chamados. O teste comprova sessão e identidade/empresa em `/auth/me`, mas não autorização de outras rotas, isolamento entre tenants, fluxo completo em navegador ou egress bloqueado. Node 20.20.2 emitiu aviso futuro do AWS SDK. A cópia permanece com senha temporária diferente da origem.
