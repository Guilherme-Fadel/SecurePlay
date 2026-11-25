import { ArrowLeft, Trash2 } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppFilterChip } from '@/components/ui/buttons/AppFilterChip';
import type { CollectibleKind } from './adminCollectiblesModel';

/** Item avulso | Kit: só na criação (a edição abre no tipo do registro). */
export function KindSwitch({ kind, onChange }: { kind: CollectibleKind; onChange: (kind: CollectibleKind) => void }) {
  return <div className="collectible-form-kind" role="group" aria-label="Tipo de cadastro">
    <AppFilterChip selected={kind === 'items'} onClick={() => onChange('items')}>Item avulso</AppFilterChip>
    <AppFilterChip selected={kind === 'kits'} onClick={() => onChange('kits')}>Kit</AppFilterChip>
  </div>;
}

interface FormActionsProps {
  busy: boolean;
  /** Registro já salvo; `published` mostra "Salvar alterações" e esconde "Publicar". */
  saved: { active: boolean } | null;
  onBack: () => void;
  onSave: () => void;
  onPublish: () => void;
  /** Só no registro salvo: abre a confirmação de exclusão. */
  onDelete?: () => void;
}

/** Voltar, Salvar rascunho (primary), Publicar (salvo e ainda não publicado) e, à parte, Excluir (registro salvo). */
export function FormActions({ busy, saved, onBack, onSave, onPublish, onDelete }: FormActionsProps) {
  return <div className="admin-console-setting-actions">
    {saved && onDelete && <AppButton variant="ghost" className="collectible-danger-button collectible-form-delete" icon={<Trash2 size={16} aria-hidden="true" />} disabled={busy} onClick={onDelete}>Excluir</AppButton>}
    <AppButton variant="ghost" icon={<ArrowLeft size={16} aria-hidden="true" />} onClick={onBack}>Voltar</AppButton>
    <AppButton variant="primary" disabled={busy} onClick={onSave}>{busy ? 'Salvando…' : saved?.active ? 'Salvar alterações' : 'Salvar rascunho'}</AppButton>
    {saved && !saved.active && <AppButton variant="secondary" disabled={busy} onClick={onPublish}>Publicar</AppButton>}
  </div>;
}
