import { useCallback, useEffect, useRef, useState } from 'react';
import { listCollectibleItems, listCollectibleKits } from '@/services/adminCollectibles';
import { appendPage, emptyFeed, feedHasMore, feedKey, feedParams, replaceRow, type CollectibleFeed, type CollectibleKind, type CollectibleListFilters, type CollectibleListQuery, type CollectibleRow } from './adminCollectiblesModel';

interface FeedState { key: string; feed: CollectibleFeed; first: 'loading' | 'ready' | 'error'; more: 'idle' | 'loading' | 'error' }

const fetchPage = (kind: CollectibleKind, filters: CollectibleListFilters, page: number) => {
  const params = feedParams(filters, kind, page);
  return kind === 'kits' ? listCollectibleKits(params) : listCollectibleItems(params);
};

/**
 * Listagem em lotes (rolagem infinita): um pedido por vez, recomeço do lote 1 quando busca/encaixe/estado mudam e
 * descarte de respostas de pedidos antigos (geração). `replace` atualiza um cartão no lugar sem recarregar.
 */
export function useCollectibleFeed(kind: CollectibleKind, filters: Omit<CollectibleListQuery, 'page' | 'pageSize'>) {
  const key = feedKey(kind, filters);
  const [state, setState] = useState<FeedState>({ key, feed: emptyFeed, first: 'loading', more: 'idle' });
  const generation = useRef(0);
  const started = useRef<string | null>(null);
  const busy = useRef(false);
  const latest = useRef({ kind, filters, state });
  latest.current = { kind, filters, state };

  const start = useCallback(() => {
    const id = ++generation.current;
    busy.current = true;
    setState({ key, feed: emptyFeed, first: 'loading', more: 'idle' });
    fetchPage(latest.current.kind, latest.current.filters, 1).then(
      (batch) => { if (id === generation.current) { busy.current = false; setState({ key, feed: appendPage(emptyFeed, batch), first: 'ready', more: 'idle' }); } },
      () => { if (id === generation.current) { busy.current = false; setState({ key, feed: emptyFeed, first: 'error', more: 'idle' }); } },
    );
  }, [key]);

  // `started` evita o pedido duplicado do StrictMode (o efeito roda duas vezes com a mesma chave).
  useEffect(() => {
    if (started.current === key) return;
    started.current = key;
    start();
  }, [key, start]);

  const loadMore = useCallback(() => {
    const current = latest.current.state;
    if (busy.current || current.key !== key || current.first !== 'ready' || !feedHasMore(current.feed)) return;
    const id = generation.current;
    busy.current = true;
    setState((previous) => ({ ...previous, more: 'loading' }));
    fetchPage(latest.current.kind, latest.current.filters, current.feed.page + 1).then(
      (batch) => { if (id === generation.current) { busy.current = false; setState((previous) => ({ ...previous, feed: appendPage(previous.feed, batch), more: 'idle' })); } },
      () => { if (id === generation.current) { busy.current = false; setState((previous) => ({ ...previous, more: 'error' })); } },
    );
  }, [key]);

  const replace = useCallback((row: CollectibleRow) => setState((previous) => ({ ...previous, feed: { ...previous.feed, items: replaceRow(previous.feed.items, row) } })), []);

  // Entre a troca de filtro e o efeito, a tela já mostra "carregando" em vez da lista antiga.
  const stale = state.key !== key;
  const feed = stale ? emptyFeed : state.feed;
  return {
    items: feed.items,
    total: feed.total,
    page: feed.page,
    hasMore: !stale && feedHasMore(feed),
    loading: stale || state.first === 'loading',
    failed: !stale && state.first === 'error',
    loadingMore: !stale && state.more === 'loading',
    moreFailed: !stale && state.more === 'error',
    loadMore,
    retry: start,
    replace,
  };
}
