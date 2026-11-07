# Padrão de interface do frontend

Referência metodológica: [Geist Design System](https://vercel.com/geist/introduction). A aparência, as cores e os componentes continuam sendo os do SecurePlay. Este é o guia canônico do sistema de UI/UX do frontend para mudanças futuras; `AGENTS.md` do módulo determina sua leitura.

## Onde aplicar

1. Identifique a função da tela e procure o padrão equivalente já implementado. Listagens administrativas com título, ferramentas e resultados seguem `AdminListLayout`; formulários e áreas de aprendizagem mantêm sua própria composição.
2. Reuse tokens e controles `App*` quando semântica e interação coincidirem. Variações de conteúdo, busca por envio, ações, filtros e permissões ficam na tela, sem duplicar a estrutura visual.
3. Se o padrão não atender a necessidade, documente a diferença funcional antes de criar uma nova primitiva. Preserve tema da empresa e pixel art aprovada.

## Fundamentos

- `src/styles/theme.css` define marca, fontes e cores base. `src/styles/app-ui.css` define cores de superfície e texto dos temas claro/escuro e as primitivas de controle. As paletas da empresa continuam chegando por `useEmpresaTema`.
- **Camadas de cor.** Marca fixa: `--sp-*` (azul, amarelo, laranja, creme, papel, rosa, vermelho, preto e grafite `--sp-ink-900/800/700/600`); não sofre override da escola e é usada em trilho, territórios, personagem, `Pebble` e no tom amarelo do botão chunky. Marca da escola: `--primary`, `--secondary`, `--accent` e derivados, sobrescritos por `useEmpresaTema`; valem para CTAs, card principal e progresso. A secundária padrão é o laranja `#FF7101` (cor de preenchimento: texto preto sobre ela; como texto em fundo claro use `--secondary-dark`). Superfícies e texto mudam com o tema; semânticas `--success`, `--danger`, `--warning` (e `-soft` para fundos) têm valores por tema com texto AA sobre as superfícies.
- **Temas.** Claro (`:root[data-theme='light']`): fundo creme `#F9EEDC`, superfícies `#FFFFFF`/`#FFFCF7`, texto preto, apoio `#5A534A`, bordas areia `#D8C9AF`, filete `#E6D9C2`. Escuro (sem atributo): fundo `#0E0E11`, superfícies `#1C1C21`/`#16161A`/`#24242A`, texto creme `#F9EEDC`, apoio `#B4AC9F`, bordas `#45454E`, filete `#2D2D34`. Não usar azul-marinho nem texto navy na área logada.
- **Tokens da área logada.** `--dashboard-bg`, `--dashboard-surface`, `--dashboard-surface-soft`, `--dashboard-surface-raised` (menus e popovers), `--dashboard-text`, `--dashboard-muted`, `--dashboard-border`, `--app-rule` (filete) e `--app-control-border` (≥ 3:1). Identidade, no `:root` para valer também em portais: `--app-line` (`--app-line-width` 3px + `--app-line-color`, preto no claro e creme no escuro), `--app-shadow-hard` (sombra dura preta), `--app-heading` (`#2662E7` / `#8DAEFF`), `--app-eyebrow` (azul `#1D50C2` no claro, amarelo no escuro) e `--app-focus-ring`/`--app-focus-color` (azul no claro, amarelo no escuro).
- **Contraste.** Texto pequeno amarelo sobre azul reprova AA (≈ 3,7:1): sobretítulo sobre azul usa `--app-eyebrow-on-primary` (papel). `--primary` como texto no escuro fica em ≈ 3,7:1; para texto pequeno sobre grafite prefira `--app-heading`.
- **Fonte.** Bricolage Grotesque no texto corrido e na interface (`--font-family-base/inter/ui` apontam para `--font-family-brand`); JetBrains Mono continua em `--font-family-mono`. Títulos condensados usam peso 800, `font-stretch: 75%` e caixa alta (`.sp-display` nas telas públicas).
- Para controles, use `--app-control-height`, `--app-control-radius`, `--app-control-focus`, `--dashboard-border`, `--dashboard-surface-soft`, `--dashboard-text` e `--dashboard-muted`. Títulos administrativos usam `--admin-title-size` e descrições usam `--admin-copy-size`.
- `AppInput` cobre texto, e-mail e URL; `AppSearchInput` cobre busca e exige `label`; `AppSelect` apresenta opções em lista própria com tema claro/escuro, mantendo um select oculto para valor de formulário e evento `onChange`. O controle visível aceita clique, setas, Home/End, busca por letras, Enter, Escape e Tab. Todos têm altura, borda, tipografia, foco, hover e desabilitado em `app-ui.css`. Campos de cor, arquivo, checkbox e switches mantêm suas estruturas próprias.
- `AppButton` usa variantes `primary`, `secondary`, `soft` e `ghost`, com tamanhos `sm`, `control` e `md`, para controles administrativos e ações densas. A variante `chunky` é o botão da identidade nas telas do aluno: `variant="chunky"` com `tone` `yellow` (padrão, amarelo fixo da marca, texto preto), `blue` (segue `--primary`, texto branco) ou `ghost` (contorno na cor de linha do tema, sem sombra), e `size` `sm` (46 px), `md` (52 px, padrão) ou `big` (64 px, título condensado em caixa alta). Tem borda de 3px, sombra dura que afunda ao pressionar, foco `--app-focus-ring` e desabilitado sem sombra; respeita movimento reduzido. Use um único chunky amarelo/azul como ação principal por bloco.
- `Pebble` (`components/ui/visuals/Pebble.tsx`) é o símbolo da marca como moldura de uma arte (módulos, territórios, nós de mapa), com estados `done` (contorno contínuo e selo), `here` (contorno azul grosso), `next` (tracejado) e `locked` (areia escura, arte em cinza e cadeado). Recebe `src`/`alt`, `size` (largura; altura pela proporção 159:144), `pixelated` para pixel art, `children` para um número no lugar da arte e `stateLabel` quando o texto ao lado não descreve o estado. Usa a paleta fixa nos dois temas e não substitui a pixel art aprovada, apenas a emoldura.
- `AppFilterChip` é para filtros categóricos curtos com `aria-pressed`; não substitui select com muitas opções (o álbum de Conquistas usa com a variante visual `.al-chip`). `AppSectionHeader` é para seções internas, não para o título de página.
- `BrandCharacter` (`components/shared/BrandCharacter.tsx`) é o personagem da marca: corpo, rosto e olhos por token, expressões (`open`, `happy`, `wink`, `sleepy`, `closed`, `surprised`, `curious`, `startled`, `playful`), piscar e flutuar com movimento reduzido. Use para estados (vazio, erro, conquista), pets do Ranking (cor fixa pelo id do aluno) e anfitriões; não dê nome próprio a ele.
- `JourneyMap` (`components/shared/JourneyMap/`) desenha a trilha de módulos para N paradas, horizontal ou vertical (container query), com nós como botões. Início e Aprender usam o mesmo componente; props opcionais (`orientation`, `interaction`, `activeStage`, `flagLabel`) mudam o uso sem mudar o padrão. Ao esmaecer um território, esmaeça só a pedra: o rótulo do botão fica opaco para manter AA.
- `Modal` (`components/ui/modal`) é `role="dialog"` com `aria-modal`, nome pelo título, foco inicial no primeiro campo, Tab preso, Esc fecha e o foco volta a quem abriu. Detalhes que pedem gaveta/bottom sheet (figurinha do álbum) usam `<dialog>` com `showModal`.
- **Cosméticos.** Molduras e fundos equipáveis vêm de `styles/cosmetics.css` (`cosmetic-avatar` + `frame-*`, `cosmetic-background-host` + `background-*`; nomes vêm do backend). Todo avatar do aluno que mostra cosmético (menu da conta, provador, Perfil) usa essas classes para ficar coerente.

## Telas do aluno (redesign)

- Cada tela tem uma classe raiz própria (`.home-v`, `.learn-v`, `.module-v`, `.lesson-v`, `.deck-v`, `.rank-v`, `.album-v`, `.cole-v`, `.profile-v`) com um reset escopado contra as regras globais de `theme.css` em `p`/`span`/`button`/`small`/`h1–h6`: `.raiz :where(p,span,small,strong,em,a,button,li,h1,h2,h3,h4,label){font-family:inherit;font-size:inherit;line-height:inherit;letter-spacing:inherit}`. Quando uma tela é renderizada dentro de outra (Colecionáveis dentro do álbum), o reset externo exclui a interna com `:not(:where(.interna *))`, senão o CSS carregado depois sobrescreve os tamanhos dela.
- Linguagem comum: cartões com `--app-line` e `--app-shadow-hard`, títulos condensados, um card principal em `--primary` por tela (texto pequeno sobre ele em creme/branco), um único chunky amarelo/azul como ação principal por bloco. Aprender vem antes de Jogos em ordem e chamadas.
- O backend é a autoridade de progresso, XP, bloqueio, posição, fichas e chaves: a tela só exibe e deriva o que vem pronto (ex.: vizinhos do Ranking a partir do top 50, "faltam N" a partir de preço e saldo). Gestão (`admin`, `platform_admin`) vê sem participar onde houver disputa.
- Movimento: toda animação respeita `useReducedMotion` e a media query; efeitos de ponteiro só com `(pointer: fine)` e sem listeners globais.

## Carregamento de navegação e aprendizagem

- `PageLoading` registra a espera dos fallbacks de rotas e sessão no `PageLoadingProvider`, montado na raiz. A Home registra seu bootstrap no mesmo controlador: uma única `LoadingScreen` acompanha essas etapas, sem reiniciar o progresso. O tema também é fornecido na raiz e aplicado antes da pintura, sem ser removido na troca de página. O CSS da tela é carregado pelo próprio componente para cobrir o primeiro acesso. A tela usa creme/grafite da marca, card com `--app-line` e sombra dura, título condensado em `--app-heading` e sobretítulo em `--app-eyebrow`; barra e pontos seguem a cor da escola.
- `ContentLoading` representa ranking (palco 2-1-3, cartão lateral e linhas), módulo (card, barra de capítulos e capítulos), leitor da aula (painel neutro) e roteiro com silhuetas desfocadas, sem dados fictícios ou controles ativos. A espera tem nome acessível e `aria-busy`, sem mensagem de loading visível. Respeita movimento reduzido e usa tokens de tema nas superfícies.
- Erros, conteúdo vazio e acesso negado continuam com estados explícitos e ações pertinentes. As listagens administrativas mantêm os estados de `AdminListState` descritos abaixo.

## Dimensões de formulários administrativos

- Cadastro e edição usam `admin-form-grid`, com o cadastro de usuário como referência: área máxima de 900 px, duas colunas iguais e intervalo de 20 px; em até 600 px, uma coluna. Esse limite evita esticar os campos pela largura inteira de monitores grandes.
- Campos comuns usam `AppInput`/`AppSelect` com altura de `--app-control-height` (40 px), fonte de `--font-label` (13 px) e labels de 13 px, peso 600, com 7 px até o controle. Não criar alturas ou fontes locais para campos equivalentes.
- Nome, razão social, contato e complemento ocupam uma coluna por padrão. Largura total só quando a natureza do conteúdo exigir (por exemplo, um texto longo em textarea), com justificativa funcional.
- Novos formulários devem reutilizar a grade e esses tokens. Exceções de telas públicas de autenticação mantêm sua composição própria; não substituir suas medidas por este padrão administrativo.

## Uso de ícones

- Use ícones para identificar navegação (como sidebar), ações ou o significado de uma mensagem/estado. A função deve ser clara; mantenha nome acessível nas ações sem texto.
- Não acrescente ícones decorativos avulsos em modais, cards ou cabeçalhos para preencher espaço ou ornamentar conteúdo. Esse uso só entra com pedido explícito do usuário.
- Se título e texto já identificam o conteúdo, prefira a composição textual. Nas boas-vindas de apelido e nos destaques semanais, não usar ícone solto acima ou ao lado do conteúdo. Avatares identificam participantes e permanecem funcionais.
- Preserve ilustrações, pixel art e elementos de identidade já aprovados. Esta regra não autoriza removê-los nem fazer uma limpeza geral fora do escopo pedido.

## Listagens administrativas

`src/components/admin/AdminListLayout.tsx` fornece a estrutura. O CSS fica em `src/pages/admin-users.css`.

| Componente | Anatomia e uso | Estados e responsividade |
| --- | --- | --- |
| `AdminPageHeader` | Título `h1`, descrição em `AdminHelpTip`, contador e ação opcionais. Use em todas as abas administrativas; não use eyebrow. | Ajuda funciona por mouse, teclado e toque; contador é anunciado por `role=status` e no mobile fica abaixo do título. |
| `AdminCardHeading` | Título `h2` e descrição em `AdminHelpTip` para seções internas com explicação; ícone opcional quando cumprir função de identificação. | Use texto visível quando a instrução for necessária para tomar uma decisão imediata. |
| `AdminListCard` | Superfície e borda da listagem; conteúdo por composição. | Recebe `loading` para `aria-busy`. |
| `AdminListToolbar` | Busca primeiro, filtros/ordenação depois. Aceita `onSubmit` quando a busca depende de envio. | Uma linha quando cabe; controles passam a largura total no mobile. A borda inferior é o único separador sob a busca. |
| `AdminListContent` e `AdminListState` | Conteúdo da lista ou mensagem `loading`, `empty`, `error` com retry opcional. | Loading usa `role=status`, erro usa `role=alert`; não renderize linhas antigas durante loading ou erro. |
| `AdminPagination` | Página, total de páginas e callbacks fornecidos pela tela. | Botões desabilitados nos limites; cabeçalho `nav` identificado por `ariaLabel`; quebra em telas estreitas. |

A tabela usa `admin-list-table` dentro de `admin-list-table-wrap`. Cada célula fornece `data-label` para a apresentação em cartões no mobile. Badge de status usa a classe específica do domínio, como `admin-user-status` ou `admin-invite-status`; o padrão compartilhado controla apenas tipografia, espaço e superfície.

Exemplo abreviado:

```tsx
<AdminPageHeader title="Registros" description="Consulte os registros." count={total} countLabel="registros" />
<AdminListCard loading={loading}>
  <AdminListToolbar>
    <AppSearchInput label="Buscar registros" value={search} onChange={onSearchChange} />
    <AppSelect aria-label="Ordenar registros" value={sort} onChange={onSortChange}>...</AppSelect>
  </AdminListToolbar>
  <AdminListContent>
    {loading ? <AdminListState kind="loading">Carregando...</AdminListState>
      : error ? <AdminListState kind="error" onRetry={reload}>Falha ao carregar.</AdminListState>
      : items.length === 0 ? <AdminListState kind="empty">Nenhum registro.</AdminListState>
      : <div className="admin-list-table-wrap"><table className="admin-list-table">...</table></div>}
  </AdminListContent>
  <AdminPagination page={page} totalPages={totalPages} ariaLabel="Paginação de registros" onPageChange={setPage} />
</AdminListCard>
```

Em Configurações da empresa, Layout e Funcionalidades usam o mesmo `AdminPageHeader`. Os parâmetros de Funcionalidades usam linhas de switch com descrição do recurso visível, estado ligado/desligado, desabilitado e foco; a descrição orienta a escolha e não deve ficar escondida no tooltip. O tooltip cabe aos subtítulos de títulos e seções.

A tela fornece estado, API, filtros, permissões, ações, colunas e texto. Usuários e Apelidos usam busca enquanto se digita; a listagem de Empresas preserva busca por envio do formulário. A escolha da empresa administrada na barra superior usa sugestões filtradas enquanto se digita e mostra a seleção atual. Convites usa linhas com ações e Auditoria tem duas listagens sem barra de busca. Essas diferenças são funcionais. Fora da administração, Início, Aprender, Jogos, Ranking, Conquistas e Perfil mantêm layouts especializados (seção "Telas do aluno"); reutilizam as primitivas de controle quando o comportamento coincide.

Ao criar uma listagem: escolha primeiro as primitivas existentes; use a estrutura acima quando houver título, ferramentas e resultados; forneça labels e `data-label`; defina loading/vazio/erro antes de renderizar dados; confira tema claro/escuro, 320 px e desktop, teclado e overflow.

## Checklist de implementação e revisão

- **Estrutura:** componentes compartilhados para anatomia equivalente; hierarquia correta de título, descrição, ferramentas, conteúdo e paginação.
- **Interação:** busca, filtros, ordenação e ações mantêm o comportamento esperado; estados loading/vazio/erro/acesso negado são exclusivos e não exibem dados obsoletos.
- **Acessibilidade:** labels e nomes acessíveis, navegação por teclado, foco visível, semântica de tabela/lista, anúncios de estado e contraste coerente com o tema.
- **Visual:** conferir tema claro/escuro e tema de empresa, desktop e mobile estreito (incluindo 320 px), conteúdo longo e ausência de overflow horizontal.
- **Entrega:** remover estilos/JSX órfãos, executar build e checks pertinentes e registrar se a validação foi fixture, navegador autenticado ou somente código.

Este guia evolui junto com as primitivas reais. Atualize-o no mesmo trabalho que mudar um padrão compartilhado; evite documentar componentes ou estados que ainda não existem.
