import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AdminFeedback } from '@/components/admin/console/AdminFeedback';
import { useAdminListFilters } from '@/hooks/useAdminListFilters';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { hasActiveFilter, kindCopy, listParams, type CollectibleKind, type CollectibleRow } from './adminCollectiblesModel';
import { CollectibleFeedFooter } from './CollectibleFeedFooter';
import { CollectibleGrid } from './CollectibleGrid';
import { CollectibleFilters } from './CollectibleFilters';
import { ItemBatchImport } from './ItemBatchImport';
import { useCollectibleFeed } from './useCollectibleFeed';
import { useCollectibleToggle } from './useCollectibleToggle';
import './collectibles.css';

export interface CollectiblesListProps {
  kind: CollectibleKind;
  onCreate: (kind: CollectibleKind) => void;
  onEdit: (kind: CollectibleKind, row: CollectibleRow) => void;
}

/**
 * Uma listagem de Colecionáveis (itens avulsos ou kits) em cartões: barra de busca e filtros grudada no topo,
 * lotes carregados conforme a página rola e publicar/arquivar no lugar. A página rola; a grade só cresce.
 */
export function CollectiblesList({ kind, onCreate, onEdit }: CollectiblesListProps) {
  const { user } = useCurrentUser();
  const { filters, setFilters, search, setSearch } = useAdminListFilters(`collectibles-list:${user?.userId}:${kind}`);
  const copy = kindCopy[kind];
  const { search: term, type, status } = listParams(filters, kind);
  const query = { search: term, type, status };
  const feed = useCollectibleFeed(kind, query);
  const { toggle, busy, feedback } = useCollectibleToggle(kind, feed.replace);
  const change = (next: { type?: string; status?: string }) => setFilters((previous) => ({ ...previous, ...next, page: 1 }));
  const emptyText = filters.search ? copy.emptySearch : hasActiveFilter(query) ? copy.emptyFilter : copy.empty;
  return <>
    {feedback && <AdminFeedback variant={feedback.error ? 'error' : 'success'}>{feedback.text}</AdminFeedback>}
    <section className="collectible-list" aria-busy={feed.loading}>
      <div className="collectible-bar">
        <AppSearchInput label={copy.searchLabel} value={search} placeholder={copy.searchLabel} onChange={(event) => setSearch(event.target.value)} />
        <CollectibleFilters kind={kind} type={type ?? ''} status={status ?? ''} onChange={change} />
        {kind === 'items' && <ItemBatchImport onCreated={feed.retry} />}
      </div>
      <div className="collectible-board">
        <CollectibleGrid kind={kind} loading={feed.loading} failed={feed.failed} rows={feed.items} busy={busy} emptyText={emptyText} onRetry={feed.retry} onCreate={() => onCreate(kind)} onEdit={(entry) => onEdit(kind, entry)} onToggle={(entry) => void toggle(entry)} />
        {!feed.loading && !feed.failed && feed.items.length > 0 && <CollectibleFeedFooter shown={feed.items.length} total={feed.total} page={feed.page} hasMore={feed.hasMore} loadingMore={feed.loadingMore} failed={feed.moreFailed} onLoadMore={feed.loadMore} />}
      </div>
    </section>
  </>;
}
