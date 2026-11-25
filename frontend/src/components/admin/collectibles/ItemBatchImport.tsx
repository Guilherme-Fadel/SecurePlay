import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { AdminFeedback } from '@/components/admin/console/AdminFeedback';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { BatchImportDialog } from './BatchImportDialog';
import { IMPORT_BATCH_MAX_BYTES, IMPORT_BATCH_TOO_BIG, parseCollectibleBatch, type BatchEntry } from './collectibleImport';

interface ItemBatchImportProps {
  /** Recarrega a lista depois de criar rascunhos. */
  onCreated: () => void;
}

interface Opened { fileName: string; entries: BatchEntry[]; id: number }

/** Botão "Importar JSON" da aba Itens avulsos: lê o arquivo, recusa o que não é do organizador e abre a análise. */
export function ItemBatchImport({ onCreated }: ItemBatchImportProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [opened, setOpened] = useState<Opened | null>(null);
  const pick = async (file: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    setBusy(true); setError(undefined);
    try {
      if (file.size > IMPORT_BATCH_MAX_BYTES) { setError(IMPORT_BATCH_TOO_BIG); return; }
      const result = parseCollectibleBatch(await file.text());
      if (result.ok) setOpened({ fileName: file.name, entries: result.entries, id: Date.now() });
      else setError(result.error);
    } catch { setError('Não foi possível ler o arquivo.'); } finally { setBusy(false); }
  };
  return <>
    <AppButton variant="ghost" size="control" className="collectible-import-button" icon={<FileUp size={16} aria-hidden="true" />} disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Lendo…' : 'Importar JSON'}</AppButton>
    <input ref={input} className="collectible-art-file" type="file" accept=".json,application/json" tabIndex={-1} aria-hidden="true" onChange={(event) => void pick(event.target.files?.[0])} />
    {error && <div className="collectible-bar-notice"><AdminFeedback variant="error">{error}</AdminFeedback></div>}
    {opened && <BatchImportDialog key={opened.id} fileName={opened.fileName} entries={opened.entries} onClose={() => setOpened(null)} onFinished={onCreated} />}
  </>;
}
