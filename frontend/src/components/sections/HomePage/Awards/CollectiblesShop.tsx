import { useRef, type KeyboardEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import { DigitalKeyIcon } from '@/components/ui/visuals/DigitalKeyIcon';
import { cn } from '@/lib/utils';
import type { AchievementTrail, CosmeticItem, CosmeticType } from '@/services/achievements';
import { CosmeticArt } from './CollectiblesArt';
import {
  itemAriaLabel,
  itemState,
  itemsOfType,
  missingLabel,
  rarityLabel,
  requirementInfo,
  tabCounts,
  tabIndexAfterKey,
  typeTabLabel,
} from './collectiblesModel';

export const collectibleItemId = (id: number) => `cole-item-${id}`;
const tabId = (type: CosmeticType) => `cole-tab-${type}`;
const PANEL_ID = 'cole-tabpanel';

interface ShopProps {
  items: CosmeticItem[];
  tab: CosmeticType;
  onTabChange: (type: CosmeticType) => void;
  selectedId: number | null;
  onSelect: (item: CosmeticItem) => void;
  balance: number;
  trail: AchievementTrail | null;
}

/** Abas por tipo (com contagem) e a lista de itens como botões `aria-pressed`. */
export function CollectiblesShop({ items, tab, onTabChange, selectedId, onSelect, balance, trail }: ShopProps) {
  const tabs = tabCounts(items);
  const tabRefs = useRef<Partial<Record<CosmeticType, HTMLButtonElement | null>>>({});
  const visible = itemsOfType(items, tab);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = tabIndexAfterKey(event.key, index, tabs.length);
    if (next === null) return;
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    onTabChange(target.type);
    tabRefs.current[target.type]?.focus();
  };

  return (
    <div className="cole-shop">
      <div className="cole-tabs" role="tablist" aria-label="Tipos de item">
        {tabs.map((entry, index) => {
          const active = entry.type === tab;
          return (
            <button
              key={entry.type}
              ref={(element) => { tabRefs.current[entry.type] = element; }}
              id={tabId(entry.type)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={PANEL_ID}
              tabIndex={active ? 0 : -1}
              className={cn('cole-tab', active && 'is-active')}
              onClick={() => onTabChange(entry.type)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {entry.label} <small>{entry.count}</small>
            </button>
          );
        })}
      </div>

      <div id={PANEL_ID} className="cole-list" role="tabpanel" aria-labelledby={tabId(tab)}>
        {visible.length === 0 ? (
          <p className="cole-list-empty">Ainda não há {typeTabLabel[tab].toLowerCase()} no catálogo.</p>
        ) : (
          <ul className="cole-items">
            {visible.map((item) => {
              const state = itemState(item);
              const requirement = state === 'lock' ? requirementInfo(item, trail) : null;
              const selected = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    id={collectibleItemId(item.id)}
                    type="button"
                    className={cn('cole-row', `is-${state}`, selected && 'is-selected')}
                    aria-pressed={selected}
                    aria-label={itemAriaLabel(item, balance, requirement)}
                    onClick={() => onSelect(item)}
                  >
                    <span className={cn('cole-tile', state === 'lock' && 'is-locked')}><CosmeticArt slug={item.slug} name={item.name} size={64} /></span>
                    <span className="cole-row-text">
                      <strong>{item.name}</strong>
                      <span className="cole-row-tags">
                        <span className={`cole-rarity cole-rarity--${item.rarity}`}>{rarityLabel[item.rarity]}</span>
                        {requirement && <small>Libera com {requirement.name}</small>}
                      </span>
                    </span>
                    <span className="cole-row-end">
                      {state === 'equipped' && <span className="cole-pill cole-pill--equipped">Equipado</span>}
                      {state === 'own' && <span className="cole-pill cole-pill--own">Seu</span>}
                      {state === 'lock' && <span className="cole-pill cole-pill--lock"><LockKeyhole size={14} aria-hidden="true" />Conquista</span>}
                      {(state === 'buy' || state === 'save') && <span className="cole-price"><DigitalKeyIcon size={20} />{item.price}</span>}
                      {state === 'save' && <small className="cole-row-miss">{missingLabel(item.price, balance)}</small>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
