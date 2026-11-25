import { useState } from 'react';
import { mensagemDeErro } from '@/components/admin/turmas/turmaUi';
import { deleteCollectible, type CollectibleKind } from '@/services/adminCollectibles';

/**
 * Exclusão definitiva com confirmação. O backend recusa (409) quando algum aluno já tem o colecionável: a mensagem
 * dele aparece no diálogo, que continua aberto. `onDeleted` só roda depois da exclusão confirmada pelo backend.
 */
export function useCollectibleDelete(kind: CollectibleKind, id: number | null, onDeleted: () => void) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = () => { setError(null); setOpen(true); };
  const cancel = () => { if (!busy) setOpen(false); };
  const confirm = async () => {
    if (id === null || busy) return;
    setBusy(true); setError(null);
    try {
      await deleteCollectible(kind, id);
      setOpen(false);
      onDeleted();
    } catch (failure) {
      setError(mensagemDeErro(failure, 'Não foi possível excluir.'));
    } finally { setBusy(false); }
  };
  return { open, busy, error, ask, cancel, confirm };
}
