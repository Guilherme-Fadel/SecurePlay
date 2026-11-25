import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { FileUp } from 'lucide-react';
import { AdminFeedback } from '@/components/admin/console/AdminFeedback';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { uploadCollectibleArt } from '@/services/adminCollectibles';
import type { ItemForm } from './adminCollectiblesForm';
import { uploadErrorText } from './ArtUploadField';
import { IMPORT_BATCH_MAX_BYTES, IMPORT_BATCH_TOO_BIG, artFileFromImport, parseCollectibleImport } from './collectibleImport';

interface ItemImportBarProps {
  /** Seletor Item avulso | Kit, que fica na mesma linha do botão. */
  kindSwitch: ReactNode;
  onChange: Dispatch<SetStateAction<ItemForm>>;
}

interface Notice { text: string; error: boolean }

/** Linha do tipo de cadastro com "Importar JSON": preenche o formulário com o arquivo do organizador de artes, sem salvar nada. */
export function ItemImportBar({ kindSwitch, onChange }: ItemImportBarProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>();
  const importFile = async (file: File): Promise<Notice> => {
    if (file.size > IMPORT_BATCH_MAX_BYTES) return { text: IMPORT_BATCH_TOO_BIG, error: true };
    const result = parseCollectibleImport(await file.text());
    if (!result.ok) return { text: result.error, error: true };
    onChange((previous) => ({ ...previous, ...result.form }));
    if (result.art) {
      try {
        const art = await uploadCollectibleArt(artFileFromImport(result.art));
        onChange((previous) => ({ ...previous, artKey: art.artKey, artUrl: art.artUrl }));
      } catch (failure) {
        return { text: `Os dados foram importados, mas a arte não foi enviada. ${uploadErrorText(failure)}`, error: true };
      }
    }
    return { text: `Dados importados de ${file.name}. Confira e salve.`, error: false };
  };
  const pick = async (file: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    setBusy(true); setNotice(undefined);
    try { setNotice(await importFile(file)); } catch { setNotice({ text: 'Não foi possível ler o arquivo.', error: true }); } finally { setBusy(false); }
  };
  return <>
    <div className="collectible-form-kind-row">
      {kindSwitch}
      <AppButton variant="ghost" size="control" icon={<FileUp size={16} aria-hidden="true" />} disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Importando…' : 'Importar JSON'}</AppButton>
      <input ref={input} className="collectible-art-file" type="file" accept=".json,application/json" tabIndex={-1} aria-hidden="true" onChange={(event) => void pick(event.target.files?.[0])} />
    </div>
    {notice && <AdminFeedback variant={notice.error ? 'error' : 'success'}>{notice.text}</AdminFeedback>}
  </>;
}
