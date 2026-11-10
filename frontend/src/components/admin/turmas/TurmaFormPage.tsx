import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { Modal } from '@/components/ui/modal';
import { AdminPageHeader } from '@/components/admin/AdminListLayout';
import { arquivarTurma, atualizarTurma, criarTurma, reativarTurma, type JornadaEdicao } from '@/services/turmas';
import { anosLetivos, mensagemDeErro, rotaTurma, type EscopoTurmas } from './turmaUi';

type DadosTurma = JornadaEdicao['turma'];

interface TurmaFormPageProps {
  escopo: EscopoTurmas;
  /** Ausente: cadastro de turma nova. */
  turma?: DadosTurma;
  onSalvo?: () => void;
}

/** Cadastro e dados da turma (nome e ano letivo); arquivar e reativar ficam aqui. */
export function TurmaFormPage({ escopo, turma, onSalvo }: TurmaFormPageProps) {
  const navigate = useNavigate();
  const [nome, setNome] = useState(turma?.nome ?? '');
  const [ano, setAno] = useState(String(turma?.ano_letivo ?? new Date().getFullYear()));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmarArquivo, setConfirmarArquivo] = useState(false);
  const anos = anosLetivos();
  const opcoesAno = turma && !anos.includes(turma.ano_letivo) ? [...anos, turma.ano_letivo] : anos;
  const alterado = !turma || nome.trim() !== turma.nome || Number(ano) !== turma.ano_letivo;

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const dados = { nome: nome.trim(), ano_letivo: Number(ano) };
      if (turma) {
        await atualizarTurma(turma.id, dados, escopo.empresaId);
        setAviso('Dados da turma salvos.');
        onSalvo?.();
      } else {
        const criada = await criarTurma(dados, escopo.empresaId);
        navigate(rotaTurma(escopo, criada.id, 'jornada'));
      }
    } catch (error) {
      setErro(mensagemDeErro(error, 'Não foi possível salvar a turma.'));
    } finally {
      setSalvando(false);
    }
  };

  const alternarArquivo = async () => {
    if (!turma) return;
    setSalvando(true);
    setErro(null);
    try {
      await (turma.ativa ? arquivarTurma(turma.id, escopo.empresaId) : reativarTurma(turma.id, escopo.empresaId));
      setConfirmarArquivo(false);
      setAviso(turma.ativa ? 'Turma arquivada. A jornada fica congelada e os convites pendentes foram cancelados.' : 'Turma reativada.');
      onSalvo?.();
    } catch (error) {
      setErro(mensagemDeErro(error, 'Não foi possível alterar a situação da turma.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="admin-users-content turma-form-page">
      {!turma && <AdminPageHeader title="Nova turma" description="A turma nasce com os módulos do catálogo na ordem atual e todas as aulas fechadas. Depois você ajusta a jornada e abre as aulas." />}
      {erro && <div className="admin-feedback is-error" role="alert"><AlertCircle size={17} aria-hidden="true" />{erro}</div>}
      {aviso && <div className="admin-feedback" role="status">{aviso}</div>}
      <form className="turma-form" onSubmit={(event) => { event.preventDefault(); void salvar(); }}>
        <fieldset className="admin-form-grid" disabled={salvando || (turma ? !turma.ativa : false)}>
          <label className="admin-console-setting-field"><span>Nome da turma</span><AppInput value={nome} maxLength={80} required placeholder="Ex.: 5º ano A" onChange={(event) => setNome(event.target.value)} /></label>
          <label className="admin-console-setting-field"><span>Ano letivo</span>
            <AppSelect aria-label="Ano letivo" value={ano} onChange={(event) => setAno(event.target.value)}>
              {opcoesAno.map((item) => <option key={item} value={String(item)}>{item}</option>)}
            </AppSelect>
          </label>
        </fieldset>
        {turma && !turma.ativa && <p role="status">Turma arquivada: reative para editar.</p>}
        <div className="admin-console-setting-actions">
          {!turma && <AppButton variant="ghost" type="button" onClick={() => navigate(rotaTurma(escopo))}>Cancelar</AppButton>}
          <AppButton type="submit" disabled={salvando || !nome.trim() || !alterado || (turma ? !turma.ativa : false)}>{salvando ? 'Salvando…' : turma ? 'Salvar' : 'Criar turma'}</AppButton>
        </div>
      </form>
      {turma && <section className="turma-archive" aria-labelledby="turma-archive-title">
        <h2 id="turma-archive-title">{turma.ativa ? 'Arquivar turma' : 'Reativar turma'}</h2>
        <p>{turma.ativa ? 'Use no fim do ano letivo. Os alunos continuam vendo o que já foi aberto até serem movidos; convites pendentes desta turma deixam de valer.' : 'A turma volta a aceitar alterações na jornada, professores e alunos.'}</p>
        <AppButton variant="secondary" disabled={salvando} onClick={() => (turma.ativa ? setConfirmarArquivo(true) : void alternarArquivo())}>{turma.ativa ? 'Arquivar' : 'Reativar'}</AppButton>
      </section>}
      <Modal open={confirmarArquivo} onClose={() => setConfirmarArquivo(false)} title="Arquivar turma?" maxWidth="460px">
        <p>A jornada fica congelada e os convites pendentes desta turma são cancelados. Você pode reativar depois.</p>
        <div className="admin-console-setting-actions">
          <AppButton variant="ghost" onClick={() => setConfirmarArquivo(false)}>Cancelar</AppButton>
          <AppButton disabled={salvando} onClick={() => void alternarArquivo()}>{salvando ? 'Arquivando…' : 'Arquivar'}</AppButton>
        </div>
      </Modal>
    </div>
  );
}
