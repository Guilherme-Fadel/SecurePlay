import { Trash2 } from 'lucide-react';
import { AdminFeedback } from '@/components/admin/console/AdminFeedback';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { Modal } from '@/components/ui/modal';

interface CollectibleDeleteDialogProps {
  open: boolean;
  name: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmação da exclusão definitiva. Esc, fundo, X e "Cancelar" fecham, exceto durante a exclusão. */
export function CollectibleDeleteDialog({ open, name, busy, error, onCancel, onConfirm }: CollectibleDeleteDialogProps) {
  return <Modal open={open} onClose={onCancel} title="Excluir colecionável" maxWidth="max-w-md">
    <div className="collectible-delete-dialog">
      <p>Excluir <strong>{name}</strong> de vez? Isso não pode ser desfeito. Só dá para excluir o que nenhum aluno tem; nesse caso, tire da loja.</p>
      {error && <AdminFeedback variant="error">{error}</AdminFeedback>}
      <div className="admin-console-setting-actions">
        <AppButton variant="ghost" disabled={busy} onClick={onCancel}>Cancelar</AppButton>
        <AppButton variant="primary" className="collectible-danger-button collectible-danger-button--solid" icon={<Trash2 size={16} aria-hidden="true" />} disabled={busy} onClick={onConfirm}>{busy ? 'Excluindo…' : 'Excluir'}</AppButton>
      </div>
    </div>
  </Modal>;
}
