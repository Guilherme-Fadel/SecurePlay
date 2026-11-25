import { AppButton } from '@/components/ui/buttons/AppButton';
import { Modal } from '@/components/ui/modal';
import { BatchImportRow } from './BatchImportRow';
import type { BatchEntry } from './collectibleImport';
import { useBatchImport } from './useBatchImport';

interface BatchImportDialogProps {
  fileName: string;
  entries: BatchEntry[];
  onClose: () => void;
  /** Chamado ao terminar a criação, para a lista recarregar e mostrar os rascunhos novos. */
  onFinished: () => void;
}

const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;

/** Diálogo de "Importar JSON" da lista: análise do arquivo, escolha dos itens e criação dos rascunhos em sequência. */
export function BatchImportDialog({ fileName, entries, onClose, onFinished }: BatchImportDialogProps) {
  const batch = useBatchImport(entries, onFinished);
  const { phase, chosen, outcomes } = batch;
  const settled = Object.values(outcomes).filter((outcome) => outcome.state !== 'running');
  const tally = (state: string) => settled.filter((outcome) => outcome.state === state).length;
  const progress = phase === 'running' ? `Criando ${settled.length + 1} de ${chosen.length}…`
    : phase === 'done' ? `Concluído: ${count(tally('created'), 'criado', 'criados')}, ${tally('exists')} já existiam, ${tally('failed')} falharam. Nada foi publicado.`
    : batch.checking ? 'Conferindo quais itens já existem…' : '';
  const close = () => { if (phase !== 'running') onClose(); };
  return <Modal open onClose={close} title="Importar colecionáveis" maxWidth="max-w-5xl">
    <div className="collectible-import">
      <p className="collectible-import-intro"><strong>{fileName}</strong>: {count(entries.length, 'item', 'itens')} no arquivo. Os itens são criados como rascunho; nada é publicado.</p>
      <div className="collectible-import-scroll">
        <table className="admin-list-table collectible-import-table">
          <caption className="sr-only">Itens do arquivo</caption>
          <thead><tr><th scope="col">Importar</th><th scope="col">Arte</th><th scope="col">Nome</th><th scope="col">Encaixe</th><th scope="col">Raridade</th><th scope="col">Preço</th><th scope="col">Situação</th></tr></thead>
          <tbody>
            {entries.map((entry) => <BatchImportRow key={entry.index} entry={entry} existence={batch.existence[entry.index]} outcome={outcomes[entry.index]}
              selectable={batch.selectable(entry)} checked={batch.isOn(entry)} locked={phase !== 'review'} onToggle={(on) => batch.toggle(entry.index, on)} />)}
          </tbody>
        </table>
      </div>
      <p className="collectible-import-progress" role="status" aria-live="polite">{progress}</p>
      <div className="collectible-import-actions">
        {phase === 'done'
          ? <AppButton variant="primary" onClick={onClose}>Fechar</AppButton>
          : <>
            <AppButton variant="ghost" disabled={phase === 'running'} onClick={close}>Cancelar</AppButton>
            <AppButton variant="primary" disabled={phase === 'running' || batch.checking || chosen.length === 0} onClick={() => void batch.run()}>
              {phase === 'running' ? 'Criando…' : `Criar ${count(chosen.length, 'rascunho', 'rascunhos')}`}
            </AppButton>
          </>}
      </div>
    </div>
  </Modal>;
}
