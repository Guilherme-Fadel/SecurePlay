import { cn } from '@/lib/utils';
import { STATUS_FILTERS, TYPE_FILTERS, type CollectibleKind } from './adminCollectiblesModel';

interface FilterProps { kind: CollectibleKind; type: string; status: string; onChange: (next: { type?: string; status?: string }) => void }
interface ChipsProps { label: string; options: ReadonlyArray<{ value: string; label: string }>; value: string; onSelect: (value: string) => void }

function Chips({ label, options, value, onSelect }: ChipsProps) {
  return <div className="collectible-chips" role="group" aria-label={label}>
    {options.map((option) => <button key={option.value || 'all'} type="button" className={cn('collectible-chip', option.value === value && 'is-active')} aria-pressed={option.value === value} onClick={() => onSelect(option.value)}>{option.label}</button>)}
  </div>;
}

/** Abas por encaixe (só itens) e por estado de publicação, ligadas aos filtros `type` e `status` da listagem. */
export function CollectibleFilters({ kind, type, status, onChange }: FilterProps) {
  return <div className="collectible-filters">
    {kind === 'items' && <Chips label="Filtrar por encaixe" options={TYPE_FILTERS} value={type} onSelect={(value) => onChange({ type: value })} />}
    <Chips label="Filtrar por estado" options={STATUS_FILTERS} value={status} onSelect={(value) => onChange({ status: value })} />
  </div>;
}
