import { useEffect } from 'react';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AdminListToolbar } from '@/components/admin/AdminListLayout';
import { AdminFeedback } from '@/components/admin/console/AdminFeedback';
import { AdminGridPagination } from '@/components/admin/console/AdminGridPagination';
import { useAdminListFilters } from '@/hooks/useAdminListFilters';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { adminQueryKey } from '@/lib/adminCache';
import { listCollectibleItems, listCollectibleKits, type CollectiblePage } from '@/services/adminCollectibles';
import { hasActiveFilter, kindCopy, listParams, type CollectibleKind, type CollectibleRow } from './adminCollectiblesModel';
import { CollectibleGrid } from './CollectibleGrid';
import { CollectibleFilters } from './CollectibleFilters';
import { useCollectibleToggle } from './useCollectibleToggle';
import './collectibles.css';

export interface CollectiblesListProps {
  kind: CollectibleKind;
  onCreate: (kind: CollectibleKind) => void;
  onEdit: (kind: CollectibleKind, row: CollectibleRow) => void;
}

const NO_RESULTS: CollectiblePage<CollectibleRow> = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };

/** Uma listagem de Colecionáveis (itens avulsos ou kits) em cartões, com busca, filtros, paginação e publicar/arquivar. */
export function CollectiblesList({ kind, onCreate, onEdit }: CollectiblesListProps) {
  const { user } = useCurrentUser();
  const { filters, setFilters, search, setSearch, normalizePage } = useAdminListFilters(`collectibles-list:${user?.userId}:${kind}`);
  const { toggle, busy, feedback } = useCollectibleToggle(kind);
  const copy = kindCopy[kind];
  const params = listParams(filters, kind);
  const query = useCachedQuery<CollectiblePage<CollectibleRow>>(
    adminQueryKey('collectibles', undefined, { kind, ...params }),
    () => (kind === 'kits' ? listCollectibleKits(params) : listCollectibleItems(params)),
  );
  const data = query.data ?? NO_RESULTS;
  useEffect(() => { if (query.data) normalizePage(query.data.totalPages); }, [query.data, filters.page]);
  const change = (next: { type?: string; status?: string }) => setFilters((previous) => ({ ...previous, ...next, page: 1 }));
  const failed = !query.loading && Boolean(query.error);
  const emptyText = filters.search ? copy.emptySearch : hasActiveFilter(params) ? copy.emptyFilter : copy.empty;
  return <>
    {feedback && <AdminFeedback variant={feedback.error ? 'error' : 'success'}>{feedback.text}</AdminFeedback>}
    <section className="admin-data-grid" aria-busy={query.loading}>
      <div className="admin-data-grid-toolbar collectible-toolbar">
        <AdminListToolbar>
          <AppSearchInput label={copy.searchLabel} value={search} placeholder={copy.searchLabel} onChange={(event) => setSearch(event.target.value)} />
        </AdminListToolbar>
        <CollectibleFilters kind={kind} type={params.type ?? ''} status={params.status ?? ''} onChange={change} />
      </div>
      <div className="admin-data-grid-body">
        <CollectibleGrid kind={kind} loading={query.loading} failed={failed} rows={data.items} busy={busy} emptyText={emptyText} onRetry={query.refetch} onCreate={() => onCreate(kind)} onEdit={(entry) => onEdit(kind, entry)} onToggle={(entry) => void toggle(entry)} />
      </div>
      <footer className="admin-data-grid-footer">
        <AdminGridPagination ariaLabel={`Paginação de ${copy.tab.toLowerCase()}`} page={filters.page} pageSize={filters.pageSize} total={data.total} totalPages={data.totalPages} loading={query.loading} onPageChange={(page) => setFilters((previous) => ({ ...previous, page }))} onPageSizeChange={(pageSize) => setFilters((previous) => ({ ...previous, pageSize, page: 1 }))} />
      </footer>
    </section>
  </>;
}
