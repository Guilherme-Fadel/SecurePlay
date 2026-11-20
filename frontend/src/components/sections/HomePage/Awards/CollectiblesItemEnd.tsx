import { LockKeyhole } from 'lucide-react';
import { DigitalKeyIcon } from '@/components/ui/visuals/DigitalKeyIcon';
import type { CosmeticItem } from '@/services/achievements';
import { lockLabel } from './characterModel';
import { missingLabel, type ItemState } from './collectiblesModel';

/** Fim da linha do item: estado (equipado, seu, o que falta para liberar) ou preço e quanto falta. */
export function CollectiblesItemEnd({ item, state, balance }: { item: Pick<CosmeticItem, 'price' | 'unlock'>; state: ItemState; balance: number }) {
  return (
    <span className="cole-row-end">
      {state === 'equipped' && <span className="cole-pill cole-pill--equipped">Equipado</span>}
      {state === 'own' && <span className="cole-pill cole-pill--own">Seu</span>}
      {state === 'lock' && <span className="cole-pill cole-pill--lock"><LockKeyhole size={14} aria-hidden="true" />{lockLabel(item.unlock)}</span>}
      {(state === 'buy' || state === 'save') && <span className="cole-price"><DigitalKeyIcon size={20} />{item.price}</span>}
      {state === 'save' && <small className="cole-row-miss">{missingLabel(item.price, balance)}</small>}
    </span>
  );
}
