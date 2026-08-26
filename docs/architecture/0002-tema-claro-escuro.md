# 0002 - Tema claro/escuro (dark/light mode)

## Context

O frontend era dark-only, com tokens de cor fixos num unico bloco `:root` em
`frontend/src/styles/theme.css`. Surgiu a necessidade de oferecer um tema claro
alternavel pelo usuario, disponivel apenas dentro da Home (area autenticada).
Landing e Login devem permanecer sempre no tema escuro. A decisao precisava
definir onde persistir a preferencia e como aplicar o tema sem regressao visual
nem flash de tema incorreto (FOUT).

## Decision

1) Persistencia em `localStorage` (chave `secureplay-theme`), nao no backend.
   Tema e preferencia de dispositivo/navegador, nao dado de negocio. Evita
   migration, endpoint, DTO e ownership, e nao depende do `synchronize:true`
   atual (ver ADR 0001).

2) Tokens de tema claro definidos em `theme.css` sob o seletor
   `[data-theme='light']`, sobrescrevendo apenas tokens semanticos (background,
   surface, text, border) e mantendo as cores de marca (primary/secondary/accent).

3) Estado gerenciado por `ThemeContext` (`frontend/src/contexts/ThemeContext.tsx`),
   seguindo o padrao do `SectionContext` (context + hook `useTheme` + provider).
   O `ThemeProvider` e montado somente na Home. Ele aplica `data-theme` no
   elemento raiz (`document.documentElement`) enquanto a Home esta montada e o
   remove ao desmontar, garantindo que Landing/Login permanecam escuros.

4) Script anti-flash inline em `index.html`: le a preferencia antes do React
   montar e aplica `data-theme` apenas quando a rota e `/home`, evitando piscada
   de tema. Fallback de primeira visita: `prefers-color-scheme`.

5) Controle de UI: switch no dropdown do usuario (`UserMenu.tsx`), com estados
   claro e escuro (formato de parametro).

## Alternatives

1) Persistir no backend por usuario. Rejeitada por ora: exige schema/endpoint,
   introduz flash garantido ate a request voltar e nao agrega valor de negocio.
   Fica como evolucao futura caso se deseje sincronizar entre dispositivos.

2) Alternar a classe/atributo no `:root` de forma global (sem escopo por rota).
   Rejeitada: vazaria o tema claro para Landing/Login.

3) Usar a variante `dark:` do Tailwind e inverter o default para light.
   Rejeitada: maior superficie de mudanca em telas ja existentes e risco de
   regressao visual; o projeto ja opera com tokens CSS semanticos.

## Consequences

1) Positivas: mudanca minima, sem backend, sem dependencia nova, anti-flash na
   Home, identidade de marca preservada, escopo isolado da area autenticada.

2) Negativas/limitacoes: preferencia nao sincroniza entre dispositivos; o tema
   claro cobre apenas a Home (por design). Telas futuras devem usar os tokens
   semanticos (nao cores hardcoded) para herdar o tema automaticamente.

3) Padrao a seguir: novas telas e componentes devem consumir os tokens de
   `theme.css` (var(--background), var(--surface), var(--text-primary), etc.),
   nunca cores fixas, para funcionar nos dois temas sem ajuste extra.
