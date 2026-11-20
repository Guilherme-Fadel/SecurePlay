import { AppButton } from '@/components/ui/buttons/AppButton';
import { kindCopy, type CollectibleKind, type CollectibleRow } from './adminCollectiblesModel';
import { CollectibleCard, CollectibleSkeletons, NewCollectibleCard } from './CollectibleCard';

interface CollectibleGridProps {
  kind: CollectibleKind;
  loading: boolean;
  failed: boolean;
  rows: CollectibleRow[];
  busy: boolean;
  emptyText: string;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (row: CollectibleRow) => void;
  onToggle: (row: CollectibleRow) => void;
}

/** Grade fluida de cartões com os estados de carregando (silhuetas), erro com nova tentativa e vazio. */
export function CollectibleGrid({ kind, loading, failed, rows, busy, emptyText, onRetry, onCreate, onEdit, onToggle }: CollectibleGridProps) {
  const copy = kindCopy[kind];
  if (failed) return <div className="admin-data-grid-state is-error" role="alert"><span>Não foi possível carregar os colecionáveis.</span><AppButton variant="secondary" onClick={onRetry}>Tentar novamente</AppButton></div>;
  return <>
    {loading && <p className="sr-only" role="status">Carregando colecionáveis…</p>}
    <ul className="collectible-grid" aria-label={copy.tab}>
      {!loading && <NewCollectibleCard label={`+ ${copy.newLabel}`} onCreate={onCreate} />}
      {loading ? <CollectibleSkeletons /> : rows.map((row) => <CollectibleCard key={row.id} row={row} busy={busy} onEdit={onEdit} onToggle={onToggle} />)}
    </ul>
    {!loading && rows.length === 0 && <p className="collectible-empty">{emptyText}</p>}
  </>;
}
