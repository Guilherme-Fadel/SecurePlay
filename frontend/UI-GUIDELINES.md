# Padrão de interface do frontend

Referência metodológica: [Geist Design System](https://vercel.com/geist/introduction). A aparência, as cores e os componentes continuam sendo os do SecurePlay. Este é o guia canônico do sistema de UI/UX do frontend para mudanças futuras; `AGENTS.md` do módulo determina sua leitura.

## Onde aplicar

1. Identifique a função da tela e procure o padrão equivalente já implementado. Listagens administrativas com título, ferramentas e resultados seguem `AdminListLayout`; formulários e áreas de aprendizagem mantêm sua própria composição.
2. Reuse tokens e controles `App*` quando semântica e interação coincidirem. Variações de conteúdo, busca por envio, ações, filtros e permissões ficam na tela, sem duplicar a estrutura visual.
3. Se o padrão não atender a necessidade, documente a diferença funcional antes de criar uma nova primitiva. Preserve tema da empresa e pixel art aprovada.

## Fundamentos

- `src/styles/theme.css` define marca, fontes e cores base. `src/styles/app-ui.css` define cores de superfície e texto dos temas claro/escuro e as primitivas de controle. As paletas da empresa continuam chegando por `useEmpresaTema`.
- Para controles, use `--app-control-height`, `--app-control-radius`, `--app-control-focus`, `--dashboard-border`, `--dashboard-surface-soft`, `--dashboard-text` e `--dashboard-muted`. Títulos administrativos usam `--admin-title-size` e descrições usam `--admin-copy-size`.
- `AppInput` cobre texto, e-mail e URL; `AppSearchInput` cobre busca e exige `label`; `AppSelect` apresenta opções em lista própria com tema claro/escuro, mantendo um select oculto para valor de formulário e evento `onChange`. O controle visível aceita clique, setas, Home/End, busca por letras, Enter, Escape e Tab. Todos têm altura, borda, tipografia, foco, hover e desabilitado em `app-ui.css`. Campos de cor, arquivo, checkbox e switches mantêm suas estruturas próprias.
- `AppButton` usa variantes `primary`, `secondary`, `soft` e `ghost`, com tamanhos `sm`, `control` e `md`. `AppFilterChip` é para filtros categóricos curtos com `aria-pressed`; não substitui select com muitas opções. `AppSectionHeader` é para seções internas, não para o título de página.

## Listagens administrativas

`src/components/admin/AdminListLayout.tsx` fornece a estrutura. O CSS fica em `src/pages/admin-users.css`.

| Componente | Anatomia e uso | Estados e responsividade |
| --- | --- | --- |
| `AdminPageHeader` | Título `h1`, descrição em `AdminHelpTip`, contador e ação opcionais. Use em todas as abas administrativas; não use eyebrow. | Ajuda funciona por mouse, teclado e toque; contador é anunciado por `role=status` e no mobile fica abaixo do título. |
| `AdminCardHeading` | Título `h2`, ícone e descrição em `AdminHelpTip` para seções internas com explicação. | Use texto visível quando a instrução for necessária para tomar uma decisão imediata. |
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

A tela fornece estado, API, filtros, permissões, ações, colunas e texto. Usuários e Apelidos usam busca enquanto se digita; a listagem de Empresas preserva busca por envio do formulário. A escolha da empresa administrada na barra superior usa sugestões filtradas enquanto se digita e mostra a seleção atual. Convites usa linhas com ações e Auditoria tem duas listagens sem barra de busca. Essas diferenças são funcionais. Fora da administração, Ranking, Conteúdos, Conquistas e busca do cabeçalho mantêm layouts especializados; reutilizam as primitivas de controle quando o comportamento coincide.

Ao criar uma listagem: escolha primeiro as primitivas existentes; use a estrutura acima quando houver título, ferramentas e resultados; forneça labels e `data-label`; defina loading/vazio/erro antes de renderizar dados; confira tema claro/escuro, 320 px e desktop, teclado e overflow.

## Checklist de implementação e revisão

- **Estrutura:** componentes compartilhados para anatomia equivalente; hierarquia correta de título, descrição, ferramentas, conteúdo e paginação.
- **Interação:** busca, filtros, ordenação e ações mantêm o comportamento esperado; estados loading/vazio/erro/acesso negado são exclusivos e não exibem dados obsoletos.
- **Acessibilidade:** labels e nomes acessíveis, navegação por teclado, foco visível, semântica de tabela/lista, anúncios de estado e contraste coerente com o tema.
- **Visual:** conferir tema claro/escuro e tema de empresa, desktop e mobile estreito (incluindo 320 px), conteúdo longo e ausência de overflow horizontal.
- **Entrega:** remover estilos/JSX órfãos, executar build e checks pertinentes e registrar se a validação foi fixture, navegador autenticado ou somente código.

Este guia evolui junto com as primitivas reais. Atualize-o no mesmo trabalho que mudar um padrão compartilhado; evite documentar componentes ou estados que ainda não existem.
