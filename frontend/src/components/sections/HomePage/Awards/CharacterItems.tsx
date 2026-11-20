import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { AchievementShop, CosmeticItem } from '@/services/achievements';
import { CharacterThumb } from './CharacterThumb';
import { CollectiblesItemEnd } from './CollectiblesItemEnd';
import { characterItemLabel, festiveLabel, slotCounts, slotGroups, type CharacterSlot } from './characterModel';
import { itemState, rarityLabel, tabIndexAfterKey } from './collectiblesModel';

export const characterItemId = (id: number) => `chr-item-${id}`;
const tabId = (slot: CharacterSlot) => `chr-tab-${slot}`;
const PANEL_ID = 'chr-tabpanel';

interface ItemsProps {
  shop: Pick<AchievementShop, 'items' | 'kits'>;
  slot: CharacterSlot;
  onSlotChange: (slot: CharacterSlot) => void;
  tryingId: number | null;
  onTry: (item: CosmeticItem) => void;
  balance: number;
}

/** Abas por encaixe e, em cada uma, a coleção do aluno e o que está à venda. */
export function CharacterItems({ shop, slot, onSlotChange, tryingId, onTry, balance }: ItemsProps) {
  const tabs = slotCounts(shop);
  const tabRefs = useRef<Partial<Record<CharacterSlot, HTMLButtonElement | null>>>({});
  const groups = slotGroups(shop, slot);
  const current = tabs.find((entry) => entry.slot === slot);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = tabIndexAfterKey(event.key, index, tabs.length);
    const target = next === null ? undefined : tabs[next];
    if (!target) return;
    event.preventDefault();
    onSlotChange(target.slot);
    tabRefs.current[target.slot]?.focus();
  };

  return (
    <div className="cole-shop">
      <div className="cole-tabs" role="tablist" aria-label="Encaixes do personagem">
        {tabs.map((entry, index) => {
          const active = entry.slot === slot;
          return (
            <button
              key={entry.slot}
              ref={(element) => { tabRefs.current[entry.slot] = element; }}
              id={tabId(entry.slot)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={PANEL_ID}
              tabIndex={active ? 0 : -1}
              className={cn('cole-tab', active && 'is-active')}
              onClick={() => onSlotChange(entry.slot)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {entry.label} <small>{entry.count}</small>
            </button>
          );
        })}
      </div>

      <div id={PANEL_ID} className="cole-list" role="tabpanel" aria-labelledby={tabId(slot)}>
        {current?.count === 0 ? (
          <p className="cole-list-empty">Ainda não há itens de {current.label.toLowerCase()} no catálogo.</p>
        ) : (
          <>
            <ItemGroup title="Na sua coleção" items={groups.collection} tryingId={tryingId} onTry={onTry} balance={balance} />
            <ItemGroup title="À venda" items={groups.forSale} tryingId={tryingId} onTry={onTry} balance={balance} />
          </>
        )}
      </div>
    </div>
  );
}

function ItemGroup({ title, items, tryingId, onTry, balance }: { title: string; items: CosmeticItem[]; tryingId: number | null; onTry: (item: CosmeticItem) => void; balance: number }) {
  if (items.length === 0) return null;
  return (
    <section className="chr-group" aria-label={title}>
      <h3 className="chr-group-title">{title}</h3>
      <ul className="cole-items">
        {items.map((item) => {
          const state = itemState(item);
          const selected = item.id === tryingId;
          const festive = festiveLabel(item);
          return (
            <li key={item.id}>
              <button
                id={characterItemId(item.id)}
                type="button"
                className={cn('cole-row', `is-${state}`, selected && 'is-selected')}
                aria-pressed={selected}
                aria-label={characterItemLabel(item, balance)}
                onClick={() => onTry(item)}
              >
                <span className={cn('cole-tile', state === 'lock' && 'is-locked')}><CharacterThumb source={item} /></span>
                <span className="cole-row-text">
                  <strong>{item.name}</strong>
                  <span className="cole-row-tags">
                    <span className={`cole-rarity cole-rarity--${item.rarity}`}>{rarityLabel[item.rarity]}</span>
                    {festive && <small>{festive}</small>}
                    {state === 'lock' && <small>Veja as exigências</small>}
                  </span>
                </span>
                <CollectiblesItemEnd item={item} state={state} balance={balance} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
