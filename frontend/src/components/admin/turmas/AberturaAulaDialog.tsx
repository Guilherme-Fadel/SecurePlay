import { useId, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { Modal } from '@/components/ui/modal';
import { brasiliaLocalToIso, isoToBrasiliaLocal } from '@/lib/brasiliaTime';

interface AberturaAulaDialogProps {
  titulo: string;
  /** Agendamento atual, para "Alterar". */
  abreEm: string | null;
  salvando: boolean;
  erro: string | null;
  onConfirmar: (abreEmIso: string) => void;
  onClose: () => void;
}

function amanhaAsOito(): string {
  const amanha = isoToBrasiliaLocal(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  return `${amanha.slice(0, 10)}T08:00`;
}

/**
 * Data e hora de abertura no horário de Brasília. Variante funcional registrada no guia:
 * `AppInput` não cobre data/hora, então o campo nativo usa os tokens de controle.
 */
export function AberturaAulaDialog({ titulo, abreEm, salvando, erro, onConfirmar, onClose }: AberturaAulaDialogProps) {
  const campo = useId();
  const [valor, setValor] = useState(abreEm ? isoToBrasiliaLocal(abreEm) : amanhaAsOito());
  const minimo = isoToBrasiliaLocal(new Date().toISOString());
  const valido = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor) && valor > minimo;
  return (
    <Modal open onClose={onClose} title={abreEm ? 'Alterar abertura' : 'Agendar abertura'} maxWidth="440px">
      <form className="turma-schedule-form" onSubmit={(event) => { event.preventDefault(); if (valido) onConfirmar(brasiliaLocalToIso(valor)); }}>
        <p><strong>{titulo}</strong> abre para a turma no dia e horário escolhidos (horário de Brasília).</p>
        {erro && <div className="admin-feedback is-error" role="alert"><AlertCircle size={17} aria-hidden="true" />{erro}</div>}
        <label className="admin-console-setting-field" htmlFor={campo}>
          <span>Data e hora</span>
          <input id={campo} className="app-text-input turma-datetime" type="datetime-local" required min={minimo} value={valor} onChange={(event) => setValor(event.target.value)} />
        </label>
        {!valido && valor && <p className="turma-hint" role="status">Escolha um horário a partir de agora.</p>}
        <div className="admin-console-setting-actions">
          <AppButton variant="ghost" type="button" onClick={onClose}>Cancelar</AppButton>
          <AppButton type="submit" disabled={!valido || salvando}>{salvando ? 'Salvando…' : abreEm ? 'Salvar novo horário' : 'Agendar'}</AppButton>
        </div>
      </form>
    </Modal>
  );
}
