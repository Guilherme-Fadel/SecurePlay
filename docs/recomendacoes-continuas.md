# Recomendações contínuas de segurança e UI/UX

Registro incremental do projeto SecurePlay. Cada ID aparece uma única vez e deve ser atualizado no próprio item quando houver mudança de evidência, prioridade ou status. O histórico de execuções registra somente o que mudou, sem repetir a recomendação inteira.

**Última revisão:** 2026-09-02 07:59:38 -03:00

## Estado atual

- **14 achados abertos:** 8 P1 e 6 P2.
- **8 achados resolvidos:** SEC-001 a SEC-004, A11Y-001 e UX-001 a UX-003.
- **Item reaberto:** A11Y-002; a parte de ARIA/foco foi corrigida, mas o menu ainda fica invisível no celular.
- Não houve alteração de código-fonte após `2026-09-02T02:01:19.126Z`; os novos itens vieram da ampliação das áreas inspecionadas.

## Achados abertos

### SEC-005 — Cookie cross-site autentica ações sem proteção contra CSRF

- **Categoria:** Segurança — sessão e requisições cross-site
- **Gravidade/prioridade:** Alta / P1
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** `render.yaml` força `COOKIE_SAME_SITE=none`; `AuthService.cookieOptions` mantém o cookie JWT com `SameSite=None` e `JwtAuthGuard` o aceita como credencial. `main.ts` configura CORS, mas não há token CSRF nem validação global de `Origin`, `Referer` ou Fetch Metadata. Há POSTs autenticados sem corpo ou preflight, como check-in, compra/equipagem de cosméticos, conclusão de aula, início de jogo, revogação de convite e logout.
- **Impacto:** Uma página maliciosa pode induzir o navegador autenticado a alterar progresso, saldo/cosméticos, convites ou a sessão. CORS impede a leitura da resposta, mas não o envio de requisições simples.
- **Sugestão prática de correção:** Preferir frontend e API no mesmo site e `SameSite=Lax`/`Strict`. Se o cookie cross-site for indispensável, aplicar proteção CSRF global, validar origem e `Sec-Fetch-Site`, exigir `application/json` ou cabeçalho não simples e testar todos os métodos inseguros.

### SEC-006 — WebSocket autenticado não possui validação explícita de origem

- **Categoria:** Segurança — WebSocket / origem
- **Gravidade/prioridade:** Média / P2
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** `AppGateway` extrai o JWT do cookie e adiciona a conexão à sala do usuário. `SocketIoAdapter` define apenas `cors`, sem `allowRequest` ou checagem explícita de `Origin` no upgrade WebSocket; com `SameSite=None`, o cookie pode acompanhar uma conexão iniciada por outro site.
- **Impacto:** Uma origem maliciosa pode tentar abrir um socket com a sessão da vítima e receber eventos `new-notification` enquanto a conexão permanecer ativa.
- **Sugestão prática de correção:** Validar uma allowlist exata de `Origin` em todo handshake/upgrade, rejeitar origens inesperadas e considerar token de conexão curto e explícito. Testar polling e WebSocket puro a partir de origem não autorizada.

### SEC-007 — Rate limiting pode agrupar usuários atrás do proxy de hospedagem

- **Categoria:** Segurança — disponibilidade / resistência a abuso
- **Gravidade/prioridade:** Média / P2
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Relação com item anterior:** SEC-004 corrigiu o armazenamento compartilhado entre réplicas. Este item trata de outro problema: a identificação do cliente atrás do proxy.
- **Evidência concisa:** O throttler identifica clientes por IP, mas o `FastifyAdapter` em `main.ts` não configura `trustProxy` e não há `getTracker` próprio. No ambiente atrás de proxy descrito em `render.yaml`, `req.ip` pode representar o proxy em vez do aluno.
- **Impacto:** Vários usuários podem compartilhar o mesmo contador e bloquear coletivamente login ou ações; confiar indiscriminadamente em `X-Forwarded-For` criaria o risco oposto de contornar os limites.
- **Sugestão prática de correção:** Confiar somente nos saltos conhecidos do provedor, usar o primeiro IP validado de `req.ips` e combinar IP com identificador de conta no login. Confirmar `req.ip` e `req.ips` no ambiente implantado.

### PRIV-001 — Ranking global divulga nome completo e organização entre tenants

- **Categoria:** Privacidade infantil / isolamento de dados
- **Gravidade/prioridade:** Alta / P1
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** `InviteRegister.tsx` solicita “Nome completo”. `DashboardService.getRanking` usa escopo global por padrão, não filtra por empresa nesse modo e retorna `name`, pontos, nível e `companyName` para os 20 primeiros. A tela `Ranking` também inicia no escopo global.
- **Impacto:** Usuários de outras escolas/organizações podem associar identidade, afiliação e desempenho de crianças, ampliando exposição e competição pública desnecessárias.
- **Sugestão prática de correção:** Usar turma/escola como escopo padrão, não retornar nome completo nem organização no ranking global e adotar apelido moderado ou identificador pseudônimo. Comparações externas devem ser opcionais e controladas pela escola/responsável.

### PRIV-002 — Cabeçalho envia nome completo a serviço externo de avatar

- **Categoria:** Privacidade infantil / terceiros
- **Gravidade/prioridade:** Alta / P1
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** `UserMenu.tsx` monta `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name)}` em todas as telas autenticadas. O nome completo segue no query string para um terceiro junto aos metadados normais da requisição.
- **Impacto:** Dados identificáveis de crianças podem aparecer em logs, caches e telemetria fora do domínio controlado pela SecurePlay sem necessidade funcional.
- **Sugestão prática de correção:** Gerar iniciais ou SVG localmente, como outras telas já fazem, ou usar arquivos internos com ID opaco. Remover nomes de URLs externas e revisar finalidade e retenção caso algum terceiro permaneça indispensável.

### PRIV-003 — Privacidade e Termos levam a telas vazias

- **Categoria:** Privacidade / transparência / confiança
- **Gravidade/prioridade:** Alta / P1
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** `KidsLandingContent.tsx` aponta para `/privacidade` e `/termos`, mas `App.tsx` não registra essas rotas nem fallback 404. A navegação validada em 390px resultou em documento vazio; o cadastro por convite também coleta nome, e-mail e senha sem apresentar esses materiais.
- **Impacto:** Crianças, responsáveis e escolas não conseguem consultar o uso de dados ou as condições do serviço antes do cadastro, e a tela vazia prejudica confiança e prontidão de lançamento.
- **Sugestão prática de correção:** Criar rotas acessíveis e versionadas, com resumo visual em linguagem simples para crianças e conteúdo completo para responsáveis/escolas; vincular o cadastro às páginas e adicionar uma 404 orientativa. Validar o conteúdo jurídico com especialista.

### A11Y-002 — Menu infantil permanece invisível quando anunciado como aberto

- **Categoria:** Acessibilidade / navegação móvel
- **Gravidade/prioridade:** Alta / P1
- **Status:** Reaberto em 2026-09-02
- **Histórico da correção:** `aria-expanded`, `aria-controls`, Escape e restauração de foco foram implementados em 2026-09-01 e permanecem corretos.
- **Evidência atual:** A regra base de `kids-landing.css` define `.kids-mobile-nav { display: none; }`; o breakpoint até 760px estiliza o menu, mas não redefine `display`. Em 390px, o botão mudou para `aria-expanded="true"` e “Fechar menu”, enquanto o `nav` continuou invisível e com área 0×0.
- **Impacto:** Crianças e responsáveis recebem a indicação de que a navegação abriu, mas não conseguem acessar Missões, Escolas, Dúvidas ou Entrar.
- **Sugestão prática de correção:** Definir `display: grid` ou `block` no breakpoint e adicionar teste que abra o menu em 320, 390 e 760px e confirme os itens visíveis e acionáveis.

### A11Y-003 — Itens da sidebar não são operáveis por teclado

- **Categoria:** Acessibilidade / semântica de navegação
- **Gravidade/prioridade:** Média / P2
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** `SidebarItem` usa `<li onClick>` sem `tabIndex`, `onKeyDown` ou controle nativo. No modo recolhido, o rótulo aparece apenas em estado de hover do mouse.
- **Impacto:** Pessoas que usam teclado, acionador alternativo ou tecnologia assistiva não conseguem trocar entre as seções principais nem identificar facilmente os ícones recolhidos.
- **Sugestão prática de correção:** Usar `<button type="button">` dentro de cada `<li>`, aplicar `aria-current`, foco visível e tooltip também em `:focus-visible`; testar Tab, Enter e Espaço.

### A11Y-004 — Feedback do Termo Tech depende apenas de cor

- **Categoria:** Acessibilidade / jogos
- **Gravidade/prioridade:** Média / P2
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** As letras tentadas são `<div>` com classes `correct`, `present` ou `absent`; o CSS comunica os estados somente por verde, amarelo e cinza, sem texto, símbolo ou rótulo acessível.
- **Impacto:** Crianças com daltonismo ou leitor de tela não conseguem interpretar a regra principal de feedback do jogo.
- **Sugestão prática de correção:** Combinar cor com símbolos/formas, incluir rótulos por letra e anunciar o resultado da linha em região `aria-live`, mantendo contraste suficiente.

### UX-004 — Navegação autenticada desaparece em celulares

- **Categoria:** Usabilidade / UI/UX infantil responsiva
- **Gravidade/prioridade:** Alta / P1
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** `Home.tsx` oferece Dashboard, Conteúdos, Jogos, Ranking e Conquistas somente pela `Sidebar`. Em `app-ui.css`, o breakpoint até 560px aplica `display: none` à sidebar; o cabeçalho não fornece drawer, menu ou barra inferior substituta.
- **Impacto:** No telefone, a criança fica presa na seção atual e perde o caminho visível para as tarefas centrais da plataforma.
- **Sugestão prática de correção:** Adotar barra inferior com 3–4 destinos e “Mais”, ou drawer acessível permanente. Manter ícone mais rótulo, estado ativo, ordem estável e alvos de 48px.

### UX-005 — Entrada mantém linguagem corporativa para crianças

- **Categoria:** Conteúdo / cognição / UI/UX infantil
- **Gravidade/prioridade:** Alta / P1
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** `LoginRegister.tsx` usa “plataforma de conscientização”, “cultura de segurança da sua empresa”, “credenciais”, “e-mail corporativo” e “administrador da sua empresa”. O cadastro por convite repete “e-mail corporativo” e vínculo à “empresa”.
- **Impacto:** Crianças podem não entender quais dados usar ou a quem pedir ajuda; a mudança do universo de aventura para um painel corporativo aumenta dependência do adulto.
- **Sugestão prática de correção:** Separar a entrada infantil da área adulta, usar instruções diretas como “Digite seu e-mail ou usuário” e “Peça ajuda a um adulto da sua escola” e manter a narrativa visual da landing.

### UX-006 — Textos e alvos de toque são pequenos para 6–10 anos

- **Categoria:** Legibilidade / interação / design system infantil
- **Gravidade/prioridade:** Média / P2
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** `app-ui.css` define tokens de 9px, 10px e 11px e usa textos funcionais de 7–13px. A validação a 390px confirmou textos auxiliares de 10–12px e CTA de 13px. No Termo Tech, teclas móveis chegam a 26×36px.
- **Impacto:** Leitura, varredura e toque exigem mais esforço de leitores iniciantes, crianças com baixa visão ou coordenação motora reduzida.
- **Sugestão prática de correção:** Criar tokens infantis com corpo de 16–18px, texto secundário de pelo menos 14px, entrelinha generosa e controles de 44–48px; reduzir densidade por divulgação progressiva.

### UX-007 — Termo Tech usa vocabulário técnico em inglês

- **Categoria:** Conteúdo pedagógico / UI/UX infantil
- **Gravidade/prioridade:** Alta / P1
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** `TermoTech.tsx` pede em português uma “palavra de tecnologia”, mas `termoWords.ts` usa respostas como `CACHE`, `PROXY`, `BYTES`, `QUERY`, `DEBUG`, `LINUX` e `REDIS` e valida tentativas por dicionário inglês.
- **Impacto:** Para crianças brasileiras de 6–10 anos, o jogo mede inglês e jargão especializado em vez de aprendizagem de segurança digital, favorecendo frustração.
- **Sugestão prática de correção:** Criar léxico PT-BR por faixa/nível, usar palavras ensinadas previamente, pistas visuais e explicação pós-rodada, e testar compreensão com o público-alvo.

### UX-008 — Busca aparenta funcionar, mas não executa ação

- **Categoria:** Usabilidade / consistência de interação
- **Gravidade/prioridade:** Média / P2
- **Status:** Aberto
- **Primeiro registro:** 2026-09-02
- **Evidência concisa:** `SearchBar.tsx` renderiza “Buscar jogos, conquistas...” sem estado, submissão, resultados ou callback. No celular, `Header` mostra um botão de lupa sem `onClick` e sem nome acessível.
- **Impacto:** A criança interage e não recebe resposta, aprendendo que um controle visualmente ativo é inerte.
- **Sugestão prática de correção:** Implementar busca simples com resultados e estado vazio claros, ou remover/desabilitar explicitamente o controle até existir; nomear o botão móvel e fornecer retorno imediato.

## Achados resolvidos

| ID | Resolução verificada no código atual | Resolvido em |
|---|---|---|
| SEC-001 | Uploads usam allowlists por finalidade, extensão coerente e POST policy com `content-length-range`. | 2026-09-01 |
| SEC-002 | Convites novos usam `/cadastro#<token>`; consulta e conclusão enviam o token no corpo, logs o redigem e a aplicação define `Referrer-Policy: no-referrer`. A criação de empresa está incluída nessa correção. | 2026-09-01 |
| SEC-003 | Cadastro comum, convite e alteração compartilham o limite de 72 bytes UTF-8 para senhas bcrypt. | 2026-09-01 |
| SEC-004 | O throttler usa armazenamento Redis compartilhado entre réplicas. SEC-007 é distinto e trata do identificador do cliente atrás do proxy. | 2026-09-01 |
| A11Y-001 | O modal de convite controla foco, fecha com Escape e restaura o foco no disparador. | 2026-09-01 |
| UX-001 | Rotas principais usam carregamento sob demanda; o bundle base está em 227,89 kB minificado / 77,65 kB gzip, sem alerta de 500 kB. | 2026-09-01 |
| UX-002 | A landing usa dez WebPs responsivos que totalizam 315.814 bytes; os PNGs originais não são importados no bundle. | 2026-09-01 |
| UX-003 | O botão do FAQ usa `width: 100%` dentro do contêiner de 800px. | 2026-09-01 |

## Histórico de execuções

### 2026-08-31 23:02:57 -03:00

- Primeira revisão: registrados SEC-001 a SEC-004, A11Y-001 e UX-001.
- Frontend compilado; identificado bundle acima de 500 kB.

### 2026-09-01 04:03:55 -03:00

- SEC-002 passou a incluir explicitamente a criação de empresa no mesmo item.
- Registrados UX-002, UX-003 e A11Y-002.
- Frontend compilado; backend com 14 suítes e 57 testes aprovados.

### 2026-09-01 10:02:45 e 16:02:47 -03:00

- Nenhuma mudança de código ou status; nenhum item duplicado foi criado.

### 2026-09-01 20:10:43 -03:00

- Verificadas as correções de SEC-001 a SEC-004, A11Y-001, UX-001, UX-002 e UX-003.
- A11Y-002 recebeu ARIA, Escape e controle de foco, mas a validação visual posterior encontrou a regra de `display` ainda incorreta e reabriu o item.
- Backend com 16 suítes/61 testes; frontend compilado sem alerta de chunk.

### 2026-09-02 04:19:06 -03:00

- Nenhum commit nem diff de código-fonte após o corte da execução anterior.
- Registrados SEC-005 a SEC-007, PRIV-001 a PRIV-003, A11Y-003/A11Y-004 e UX-004 a UX-008.
- A11Y-002 reaberto após validação visual a 390px.
- Landing e login inspecionados em 1280×800 e 390×844; confirmados menu móvel invisível, escala reduzida e rotas vazias de Privacidade/Termos.
- Backend compilado com 17 suítes/63 testes; frontend compilado com 2.218 módulos e sem alerta de bundle.

### 2026-09-02 07:59:38 -03:00

- Auditoria de consistência do próprio relatório solicitada pelo usuário.
- Confirmado no código atual que os oito itens da seção “Achados resolvidos” permanecem corrigidos.
- Removidas as duplicações de SEC-002 e A11Y-002; cada ID agora possui uma única fonte de verdade.
- O histórico foi condensado para não reapresentar recomendações já resolvidas como pendentes.
- Nenhum código da aplicação foi alterado.
