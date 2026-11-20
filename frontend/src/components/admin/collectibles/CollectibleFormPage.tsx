import { useRef } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminListLayout';
import { AdminFeedback } from '@/components/admin/console/AdminFeedback';
import { useAdminUnsavedChanges } from '@/hooks/useAdminUnsavedChanges';
import { itemPreviewLook, kitPreviewLook } from './adminCollectiblesForm';
import type { CollectibleKind, CollectibleRow } from './adminCollectiblesModel';
import { FormActions, KindSwitch } from './CollectibleFormControls';
import { CollectiblePreview } from './CollectiblePreview';
import { ItemForm } from './ItemForm';
import { KitForm } from './KitForm';
import { useCollectibleForms } from './useCollectibleForms';
import { useCollectibleSave } from './useCollectibleSave';
import './collectibles.css';

interface CollectibleFormPageProps {
  /** Tipo do cadastro novo; ignorado na edição, que abre no tipo do registro. */
  kind: CollectibleKind;
  record?: CollectibleRow;
  onBack: () => void;
  /** Depois de cada salvamento: o histórico passa a guardar a versão salva (recarregar não perde nem desfaz nada). */
  onSaved: (row: CollectibleRow) => void;
}

const DESCRIPTION: Record<CollectibleKind, string> = {
  items: 'Cadastre um item avulso do personagem, defina como ele se libera e confira o resultado ao vivo. Salve como rascunho e publique quando a arte estiver pronta.',
  kits: 'Cadastre um kit com as peças do personagem, defina como ele se libera e confira o resultado ao vivo. O aluno compra o kit inteiro. Salve como rascunho e publique quando todas as artes estiverem prontas.',
};

/** Formulário de item avulso e de kit: cabeçalho com as ações, blocos do cadastro e a prévia do personagem ao lado. */
export function CollectibleFormPage({ kind: initialKind, record, onBack, onSaved }: CollectibleFormPageProps) {
  const forms = useCollectibleForms(initialKind, record);
  const { kind } = forms;
  // Registro salvo: o formulário reflete o backend e a entrada do histórico é substituída sem acionar o aviso de alterações.
  const allowNavigation = useRef(() => {});
  const persisted = (row: CollectibleRow) => { forms.load(row); allowNavigation.current(); onSaved(row); };
  const { saved, errors, busy, feedback, run } = useCollectibleSave({ kind, item: forms.item, kit: forms.kit, record, onPersisted: persisted });
  const editing = saved !== null;
  // Navegação (menu, voltar do navegador, recarregar) com alterações pendentes abre o aviso do console.
  const { prompt, allowNextNavigation } = useAdminUnsavedChanges(forms.dirty, undefined, busy);
  allowNavigation.current = allowNextNavigation;
  const kindSwitch = editing ? undefined : <KindSwitch kind={kind} onChange={forms.switchKind} />;
  return <div className="admin-users-content collectible-form-page">
    <AdminPageHeader title={`${editing ? 'Editar' : 'Novo'} ${kind === 'kits' ? 'kit' : 'item'}`} description={DESCRIPTION[kind]}
      action={<FormActions busy={busy} saved={saved} onBack={onBack} onSave={() => void run(false)} onPublish={() => void run(true)} />} />
    <div className="collectible-form-feedback">
      {feedback && <AdminFeedback variant={feedback.error ? 'error' : 'success'}>{feedback.text}</AdminFeedback>}
    </div>
    <div className="collectible-form-scroll">
      <div className="collectible-form-layout">
        <fieldset className="collectible-form-fieldset" disabled={busy}>
          <div className="collectible-form-main">
            {kind === 'kits'
              ? <KitForm value={forms.kit} errors={errors} onChange={forms.setKit} locked={editing} kindSwitch={kindSwitch} />
              : <ItemForm value={forms.item} errors={errors} onChange={forms.setItem} locked={editing} kindSwitch={kindSwitch} />}
          </div>
        </fieldset>
        <aside className="collectible-form-side" aria-label="Prévia do personagem">
          <CollectiblePreview look={kind === 'kits' ? kitPreviewLook(forms.kit) : itemPreviewLook(forms.item)} />
        </aside>
      </div>
    </div>
    {prompt}
  </div>;
}
