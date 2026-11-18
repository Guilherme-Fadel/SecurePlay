import { useId, useRef, useState } from 'react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import { Modal } from '@/components/ui/modal';
import { AdminFeedback } from '@/components/admin/console/AdminFeedback';
import { enviarAvisoTurma } from '@/services/turmas';
import { AVISO_MENSAGEM_MAX, AVISO_TITULO_MAX, resumoDoEnvio, validarAviso } from './avisoTurma';
import { mensagemDeErro, type EscopoTurmas } from './turmaUi';

interface AvisoTurmaDialogProps {
  escopo: EscopoTurmas;
  turmaId: number;
  turmaNome?: string;
  onClose: () => void;
  onEnviado: (resumo: string) => void;
}

/** Aviso manual da gestão: aparece no sino dos alunos ativos da turma. O Modal leva o foco ao título. */
export function AvisoTurmaDialog({ escopo, turmaId, turmaNome, onClose, onEnviado }: AvisoTurmaDialogProps) {
  const ids = useId();
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const emAndamento = useRef(false);
  const validacao = validarAviso(titulo, mensagem);

  const enviar = async () => {
    setTocado(true);
    if (!validacao.valido || emAndamento.current) return;
    emAndamento.current = true;
    setEnviando(true);
    setErro(null);
    try {
      const { enviados } = await enviarAvisoTurma(turmaId, { title: validacao.titulo, message: validacao.mensagem }, escopo.empresaId);
      onEnviado(resumoDoEnvio(enviados));
    } catch (error) {
      setErro(mensagemDeErro(error, 'Não foi possível enviar o aviso.'));
    } finally {
      emAndamento.current = false;
      setEnviando(false);
    }
  };

  return (
    <Modal open onClose={enviando ? () => undefined : onClose} title="Enviar aviso" maxWidth="480px">
      <form className="turma-schedule-form" noValidate onSubmit={(event) => { event.preventDefault(); void enviar(); }}>
        <p>Os alunos ativos{turmaNome ? ` da turma ${turmaNome}` : ' da turma'} recebem este aviso no sino de notificações.</p>
        {erro && <AdminFeedback variant="error">{erro}</AdminFeedback>}
        <label className="admin-console-setting-field turma-aviso-field" htmlFor={`${ids}-titulo`}>
          <span>Título</span>
          <AppInput id={`${ids}-titulo`} value={titulo} maxLength={AVISO_TITULO_MAX} disabled={enviando} aria-invalid={tocado && !!validacao.erroTitulo} aria-describedby={`${ids}-titulo-ajuda`} onChange={(event) => setTitulo(event.target.value)} />
          <small id={`${ids}-titulo-ajuda`} className={tocado && validacao.erroTitulo ? 'turma-aviso-erro' : undefined}>
            {tocado && validacao.erroTitulo ? `${validacao.erroTitulo} ` : ''}{titulo.length}/{AVISO_TITULO_MAX}
          </small>
        </label>
        <label className="admin-console-setting-field turma-aviso-field" htmlFor={`${ids}-mensagem`}>
          <span>Mensagem</span>
          <textarea id={`${ids}-mensagem`} className="app-text-input turma-aviso-texto" rows={4} value={mensagem} maxLength={AVISO_MENSAGEM_MAX} disabled={enviando} aria-invalid={tocado && !!validacao.erroMensagem} aria-describedby={`${ids}-mensagem-ajuda`} onChange={(event) => setMensagem(event.target.value)} />
          <small id={`${ids}-mensagem-ajuda`} className={tocado && validacao.erroMensagem ? 'turma-aviso-erro' : undefined}>
            {tocado && validacao.erroMensagem ? `${validacao.erroMensagem} ` : ''}{mensagem.length}/{AVISO_MENSAGEM_MAX}
          </small>
        </label>
        <div className="admin-console-setting-actions">
          <AppButton variant="ghost" type="button" disabled={enviando} onClick={onClose}>Cancelar</AppButton>
          <AppButton type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar aviso'}</AppButton>
        </div>
      </form>
    </Modal>
  );
}
