import { AppSelect } from '@/components/ui/forms/AppSelect';
import { cn } from '@/lib/utils';
import { STATUS_FILTERS, TYPE_FILTERS, type CollectibleKind } from './adminCollectiblesModel';

interface FilterProps { kind: CollectibleKind; type: string; status: string; onChange: (next: { type?: string; status?: string }) => void }

/** Encaixe em chips (só itens) e estado de publicação em um seletor compacto, ambos em linha com a busca. */
export function CollectibleFilters({ kind, type, status, onChange }: FilterProps) {
  return <>
    {kind === 'items' && <div className="collectible-chips" role="group" aria-label="Filtrar por encaixe">
      {TYPE_FILTERS.map((option) => <button key={option.value || 'all'} type="button" className={cn('collectible-chip', option.value === type && 'is-active')} aria-pressed={option.value === type} onClick={() => onChange({ type: option.value })}>{option.label}</button>)}
    </div>}
    <AppSelect className="collectible-status-select" aria-label="Estado" value={status} onChange={(event) => onChange({ status: event.target.value })}>
      {STATUS_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.value ? option.label : 'Todos os estados'}</option>)}
    </AppSelect>
  </>;
}
