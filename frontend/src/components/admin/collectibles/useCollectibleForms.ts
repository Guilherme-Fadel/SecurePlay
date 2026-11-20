import { useRef, useState } from 'react';
import {
  carryCommon, emptyItemForm, emptyKitForm, itemFormFromRecord, kitFormFromRecord,
  type ItemForm, type KitForm,
} from './adminCollectiblesForm';
import type { CollectibleKind, CollectibleRow } from './adminCollectiblesModel';

export const isKitRow = (row: CollectibleRow): row is Extract<CollectibleRow, { pieces: unknown }> => 'pieces' in row;

const snapshot = (item: ItemForm, kit: KitForm) => JSON.stringify({ item, kit });

/** Estado dos dois formulários (item e kit) e do tipo escolhido; o tipo só alterna na criação. */
export function useCollectibleForms(initialKind: CollectibleKind, record?: CollectibleRow) {
  const [kind, setKind] = useState<CollectibleKind>(record ? (isKitRow(record) ? 'kits' : 'items') : initialKind);
  const [item, setItem] = useState<ItemForm>(() => (record && !isKitRow(record) ? itemFormFromRecord(record) : emptyItemForm()));
  const [kit, setKit] = useState<KitForm>(() => (record && isKitRow(record) ? kitFormFromRecord(record) : emptyKitForm()));
  const baseline = useRef(snapshot(item, kit));
  // `load` roda depois de um await: lê sempre o estado mais recente, não o do render que o criou.
  const latest = useRef({ item, kit });
  latest.current = { item, kit };

  /** Depois de salvar, o formulário passa a refletir o que o backend gravou (ids das peças, URL da arte). */
  const load = (row: CollectibleRow) => {
    const nextItem = isKitRow(row) ? latest.current.item : itemFormFromRecord(row);
    const nextKit = isKitRow(row) ? kitFormFromRecord(row) : latest.current.kit;
    if (isKitRow(row)) setKit(nextKit); else setItem(nextItem);
    baseline.current = snapshot(nextItem, nextKit);
  };

  const switchKind = (next: CollectibleKind) => {
    if (next === kind) return;
    if (next === 'kits') setKit((previous) => carryCommon(item, previous)); else setItem((previous) => carryCommon(kit, previous));
    setKind(next);
  };

  return { kind, item, kit, setItem, setKit, load, switchKind, dirty: snapshot(item, kit) !== baseline.current };
}
