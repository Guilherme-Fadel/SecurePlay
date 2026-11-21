import { useState } from 'react';
import { mensagemDeErro } from '@/components/admin/turmas/turmaUi';
import { archiveCollectible, publishCollectible } from '@/services/adminCollectibles';
import { rowActions, type CollectibleKind, type CollectibleRow } from './adminCollectiblesModel';

export type CollectibleFeedback = { text: string; error?: boolean };

/** Publicar ou arquivar uma linha: o backend valida as regras de publicação; `onChanged` recebe o registro devolvido. */
export function useCollectibleToggle(kind: CollectibleKind, onChanged: (row: CollectibleRow) => void) {
  const [feedback, setFeedback] = useState<CollectibleFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const noun = kind === 'kits' ? 'Kit' : 'Item';
  const toggle = async (row: CollectibleRow) => {
    const publishing = rowActions(row).publish;
    if (!publishing && !window.confirm(kind === 'kits' ? 'Tirar este kit da loja? Ele e suas peças deixam de aparecer na loja.' : 'Tirar este item da loja? Ele deixa de aparecer na loja.')) return;
    setBusy(true); setFeedback(null);
    try {
      const updated = await (publishing ? publishCollectible(kind, row.id) : archiveCollectible(kind, row.id));
      onChanged(updated);
      setFeedback({ text: `${noun} ${publishing ? 'publicado' : 'tirado da loja'}.` });
    } catch (error) {
      setFeedback({ text: mensagemDeErro(error, `Não foi possível ${publishing ? 'publicar' : 'tirar da loja'}.`), error: true });
    } finally { setBusy(false); }
  };
  return { toggle, busy, feedback };
}
