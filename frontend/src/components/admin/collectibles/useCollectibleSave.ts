import { useState } from 'react';
import { mensagemDeErro } from '@/components/admin/turmas/turmaUi';
import {
  createCollectibleItem, createCollectibleKit, publishCollectible, updateCollectibleItem, updateCollectibleKit,
} from '@/services/adminCollectibles';
import {
  buildItemBody, buildKitBody, hasErrors, pruneErrors, validateItemForm, validateKitForm,
  type AnyForm, type FormErrors, type ItemForm, type KitForm,
} from './adminCollectiblesForm';
import type { CollectibleKind, CollectibleRow } from './adminCollectiblesModel';

export type SaveFeedback = { text: string; error?: boolean };
interface Saved { id: number; active: boolean }

interface SaveInput {
  kind: CollectibleKind;
  item: ItemForm;
  kit: KitForm;
  record?: CollectibleRow;
  /** Chamado com o que o backend devolveu, para o formulário refletir o registro salvo. */
  onPersisted: (row: CollectibleRow) => void;
}

/**
 * Salvar rascunho e Publicar. O backend valida tudo de novo e explica a recusa (arte que falta, período);
 * a mensagem aparece no topo e o que foi digitado continua no formulário. Publicar salva antes de publicar.
 */
export function useCollectibleSave({ kind, item, kit, record, onPersisted }: SaveInput) {
  const [saved, setSaved] = useState<Saved | null>(record ? { id: record.id, active: record.active } : null);
  // Erros ficam junto do formulário que foi validado: editar um campo tira o erro dele (pruneErrors).
  const [found, setFound] = useState<{ errors: FormErrors; against: AnyForm } | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<SaveFeedback | null>(null);
  const noun = kind === 'kits' ? 'Kit' : 'Item';

  const remember = (row: CollectibleRow) => { setSaved({ id: row.id, active: row.active }); onPersisted(row); };

  const persist = async (): Promise<CollectibleRow> => {
    if (kind === 'kits') {
      const body = buildKitBody(kit);
      return saved ? updateCollectibleKit(saved.id, body) : createCollectibleKit(body);
    }
    const body = buildItemBody(item);
    return saved ? updateCollectibleItem(saved.id, body) : createCollectibleItem(body);
  };

  const run = async (publish: boolean) => {
    const current = kind === 'kits' ? kit : item;
    const problems = kind === 'kits' ? validateKitForm(kit) : validateItemForm(item);
    setFound({ errors: problems, against: current });
    setFeedback(null);
    if (hasErrors(problems)) { setFeedback({ text: 'Corrija os campos destacados antes de salvar.', error: true }); return; }
    setBusy(true);
    try {
      const row = await persist();
      remember(row);
      if (!publish) { setFeedback({ text: row.active ? 'Alterações salvas.' : 'Rascunho salvo.' }); return; }
      try {
        remember(await publishCollectible(kind, row.id));
        setFeedback({ text: `${noun} publicado.` });
      } catch (error) {
        setFeedback({ text: `Salvo como rascunho, mas não foi publicado. ${mensagemDeErro(error, 'Não foi possível publicar.')}`, error: true });
      }
    } catch (error) {
      setFeedback({ text: mensagemDeErro(error, 'Não foi possível salvar.'), error: true });
    } finally { setBusy(false); }
  };

  const errors = found ? pruneErrors(found.errors, found.against, kind === 'kits' ? kit : item) : {};
  return { saved, errors, busy, feedback, run };
}
