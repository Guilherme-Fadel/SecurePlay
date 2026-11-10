import { useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, CalendarClock, Lock, Unlock, X } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { Modal } from '@/components/ui/modal';
import { formatarAbertura } from '@/lib/brasiliaTime';
import {
  cancelarAberturaAula,
  definirAberturaAula,
  obterJornada,
  salvarModulosJornada,
  type JornadaEdicao,
} from '@/services/turmas';
import { AberturaAulaDialog } from './AberturaAulaDialog';
import { resultadoDoConflito } from './jornadaConflito';
import { mensagemDeErro, statusDoErro } from './turmaUi';
import { AdminFeedback } from '@/components/admin/console/AdminFeedback';

type Aula = JornadaEdicao['modulos'][number]['aulas'][number];

interface TurmaJornadaTabProps {
  turmaId: number;
  /** Escola escolhida pela plataforma; ausente para admin e professor (escola da sessão). */
  empresaId?: number;
  jornada: JornadaEdicao;
  onAtualizada: (jornada: JornadaEdicao) => void;
}

function rotuloEstado(aula: Aula): string {
  if (aula.estado === 'aberta' && aula.abre_em) return `Aberta desde ${formatarAbertura(aula.abre_em)}`;
  if (aula.estado === 'agendada' && aula.abre_em) return `Agendada para ${formatarAbertura(aula.abre_em)}`;
  return 'Fechada';
}

/** Aulas anteriores ainda não abertas que "Abrir agora" também abre (mesma regra do backend). */
function anterioresFechadas(jornada: JornadaEdicao, aulaId: number): Aula[] {
  const ordem = jornada.modulos.flatMap((modulo) => modulo.aulas);
  const indice = ordem.findIndex((aula) => aula.aula_id === aulaId);
  return ordem.slice(0, Math.max(0, indice)).filter((aula) => aula.estado !== 'aberta');
}

/** Jornada da turma: ordem dos módulos e abertura de cada aula (agora ou agendada). */
export function TurmaJornadaTab({ turmaId, empresaId, jornada, onAtualizada }: TurmaJornadaTabProps) {
  const ativa = jornada.turma.ativa;
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<{ alvo: string; mensagem: string } | null>(null);
  const [abrir, setAbrir] = useState<Aula | null>(null);
  const [agendar, setAgendar] = useState<Aula | null>(null);
  const [erroAgenda, setErroAgenda] = useState<string | null>(null);
  const [adicionar, setAdicionar] = useState('');

  const executar = async (alvo: string, acao: () => Promise<JornadaEdicao>, sucesso: string) => {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      onAtualizada(await acao());
      setAviso(sucesso);
      return true;
    } catch (error) {
      setErro({ alvo, mensagem: mensagemDeErro(error, 'Não foi possível salvar a jornada.') });
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const salvarOrdem = (ids: number[], alvo: string, sucesso: string) =>
    void executar(alvo, () => salvarModulosJornada(turmaId, ids, empresaId), sucesso);
  const ids = jornada.modulos.map((modulo) => modulo.modulo_id);
  const mover = (indice: number, passo: -1 | 1) => {
    const proximo = [...ids];
    [proximo[indice], proximo[indice + passo]] = [proximo[indice + passo], proximo[indice]];
    salvarOrdem(proximo, `modulo-${ids[indice]}`, 'Ordem dos módulos salva.');
  };

  const abrirAgora = async (aula: Aula) => {
    setAbrir(null);
    setOcupado(true);
    setErro(null);
    try {
      const resultado = await definirAberturaAula(turmaId, aula.aula_id, { modo: 'agora' }, empresaId);
      onAtualizada(resultado);
      setAviso(resultado.abertasEmCascata.length > 1 ? `${resultado.abertasEmCascata.length} aulas abertas para a turma.` : `${aula.titulo} aberta para a turma.`);
    } catch (error) {
      const alvo = `aula-${aula.aula_id}`;
      const mensagem = mensagemDeErro(error, 'Não foi possível abrir a aula.');
      if (statusDoErro(error) !== 409) setErro({ alvo, mensagem });
      else {
        // Clique duplo ou outro professor abriu antes: recarrega; só a aula aberta vira aviso.
        try {
          const atual = await obterJornada(turmaId);
          onAtualizada(atual);
          const resultado = resultadoDoConflito(atual, aula.aula_id, aula.titulo, mensagem);
          if ('aviso' in resultado) setAviso(resultado.aviso);
          else setErro({ alvo, mensagem: resultado.erro });
        } catch {
          setErro({ alvo, mensagem });
        }
      }
    } finally {
      setOcupado(false);
    }
  };

  const confirmarAgenda = async (abreEm: string) => {
    if (!agendar) return;
    setOcupado(true);
    setErroAgenda(null);
    try {
      onAtualizada(await definirAberturaAula(turmaId, agendar.aula_id, { modo: 'agendar', abre_em: abreEm }, empresaId));
      setAviso(`${agendar.titulo} agendada para ${formatarAbertura(abreEm)}.`);
      setAgendar(null);
    } catch (error) {
      setErroAgenda(mensagemDeErro(error, 'Não foi possível agendar a aula.'));
    } finally {
      setOcupado(false);
    }
  };

  const erroDe = (alvo: string) => erro?.alvo === alvo && <p className="turma-item-error" role="alert"><AlertCircle size={14} aria-hidden="true" />{erro.mensagem}</p>;
  const cascata = abrir ? anterioresFechadas(jornada, abrir.aula_id) : [];

  return (
    <section className="turma-jornada" aria-label="Jornada da turma">
      <div className="turma-resumo">
        <p><strong>{jornada.resumo.aulasAbertas}</strong> {jornada.resumo.aulasAbertas === 1 ? 'aula aberta' : 'aulas abertas'}</p>
        <p>{jornada.resumo.proximaAbertura ? <>Próxima abertura: <strong>{jornada.resumo.proximaAbertura.titulo}</strong> · {formatarAbertura(jornada.resumo.proximaAbertura.abre_em)}</> : 'Nenhuma aula agendada.'}</p>
        {jornada.resumo.aulasAbertas === 0 && <p className="turma-alerta">Nenhuma aula aberta — os alunos só podem jogar.</p>}
      </div>
      {!ativa && <p className="turma-alerta" role="status">Turma arquivada: a jornada está congelada.</p>}
      {aviso && <AdminFeedback>{aviso}</AdminFeedback>}
      {erroDe('geral')}
      {!jornada.modulos.length && <p className="turma-vazio">A jornada está sem módulos. Adicione módulos do catálogo abaixo.</p>}
      <ol className="turma-modulos">
        {jornada.modulos.map((modulo, indice) => (
          <li key={modulo.modulo_id} className="turma-modulo">
            <header className="turma-modulo-header">
              <span className="turma-modulo-pos" aria-hidden="true">{modulo.posicao}</span>
              <h3>{modulo.titulo}</h3>
              {ativa && <div className="turma-modulo-acoes">
                <AppButton variant="ghost" size="sm" aria-label={`Subir ${modulo.titulo}`} title="Subir" disabled={ocupado || indice === 0} onClick={() => mover(indice, -1)}><ArrowUp size={15} aria-hidden="true" /></AppButton>
                <AppButton variant="ghost" size="sm" aria-label={`Descer ${modulo.titulo}`} title="Descer" disabled={ocupado || indice === ids.length - 1} onClick={() => mover(indice, 1)}><ArrowDown size={15} aria-hidden="true" /></AppButton>
                <AppButton variant="ghost" size="sm" aria-label={`Remover ${modulo.titulo} da jornada`} title="Remover da jornada" disabled={ocupado} onClick={() => salvarOrdem(ids.filter((id) => id !== modulo.modulo_id), `modulo-${modulo.modulo_id}`, `${modulo.titulo} saiu da jornada. O progresso dos alunos continua.`)}><X size={15} aria-hidden="true" /></AppButton>
              </div>}
            </header>
            {erroDe(`modulo-${modulo.modulo_id}`)}
            <ol className="turma-aulas">
              {modulo.aulas.map((aula) => (
                <li key={aula.aula_id} className={`turma-aula is-${aula.estado}`}>
                  <div className="turma-aula-info">
                    <span className="turma-aula-titulo">Aula {aula.ordem} · {aula.titulo}</span>
                    <span className="turma-aula-estado">{aula.estado === 'aberta' ? <Unlock size={13} aria-hidden="true" /> : aula.estado === 'agendada' ? <CalendarClock size={13} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}{rotuloEstado(aula)}</span>
                  </div>
                  {ativa && aula.estado !== 'aberta' && <div className="turma-aula-acoes">
                    <AppButton size="sm" disabled={ocupado} onClick={() => setAbrir(aula)}>Abrir agora</AppButton>
                    <AppButton variant="ghost" size="sm" disabled={ocupado} onClick={() => { setErroAgenda(null); setAgendar(aula); }}>{aula.estado === 'agendada' ? 'Alterar' : 'Agendar'}</AppButton>
                    {aula.estado === 'agendada' && <AppButton variant="ghost" size="sm" disabled={ocupado} onClick={() => void executar(`aula-${aula.aula_id}`, () => cancelarAberturaAula(turmaId, aula.aula_id, empresaId), `Agendamento de ${aula.titulo} cancelado.`)}>Cancelar</AppButton>}
                  </div>}
                  {erroDe(`aula-${aula.aula_id}`)}
                </li>
              ))}
              {!modulo.aulas.length && <li className="turma-aula is-vazia">Módulo sem aulas ativas.</li>}
            </ol>
          </li>
        ))}
      </ol>
      {ativa && jornada.catalogo.length > 0 && <div className="turma-catalogo">
        <AppSelect aria-label="Módulo do catálogo para adicionar" value={adicionar} disabled={ocupado} onChange={(event) => setAdicionar(event.target.value)}>
          <option value="">Adicionar módulo do catálogo</option>
          {jornada.catalogo.map((modulo) => <option key={modulo.modulo_id} value={String(modulo.modulo_id)}>{modulo.titulo}</option>)}
        </AppSelect>
        <AppButton size="control" disabled={!adicionar || ocupado} onClick={() => { const id = Number(adicionar); setAdicionar(''); salvarOrdem([...ids, id], 'geral', 'Módulo adicionado ao fim da jornada.'); }}>Adicionar</AppButton>
      </div>}
      <Modal open={abrir !== null} onClose={() => setAbrir(null)} title="Abrir aula agora?" maxWidth="460px">
        <p>Depois de aberta, a aula não fecha mais.</p>
        {cascata.length > 0 && <p>Também abrem agora: {cascata.map((aula) => aula.titulo).join(', ')}.</p>}
        <div className="admin-console-setting-actions">
          <AppButton variant="ghost" onClick={() => setAbrir(null)}>Cancelar</AppButton>
          <AppButton disabled={ocupado} onClick={() => { if (abrir) void abrirAgora(abrir); }}>Abrir agora</AppButton>
        </div>
      </Modal>
      {agendar && <AberturaAulaDialog titulo={agendar.titulo} abreEm={agendar.estado === 'agendada' ? agendar.abre_em : null} salvando={ocupado} erro={erroAgenda} onConfirmar={(iso) => void confirmarAgenda(iso)} onClose={() => setAgendar(null)} />}
    </section>
  );
}
