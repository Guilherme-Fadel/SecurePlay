import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { resolveConsolePage, turmaIdFromPath, turmaTabFromPath, type TurmaTab } from '@/components/admin/console/consoleNavigation';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { obterJornada, type JornadaEdicao } from '@/services/turmas';
import { TurmasListPage } from './TurmasListPage';
import { TurmaFormPage } from './TurmaFormPage';
import { TurmaJornadaTab } from './TurmaJornadaTab';
import { TurmaAlunosTab } from './TurmaAlunosTab';
import { TurmaProfessoresTab } from './TurmaProfessoresTab';
import { rotaTurma, statusDoErro, type EscopoTurmas } from './turmaUi';
import './turmas.css';

const ABAS: Array<{ id: TurmaTab; label: string; gestao: boolean }> = [
  { id: 'jornada', label: 'Jornada', gestao: false },
  { id: 'alunos', label: 'Alunos', gestao: false },
  { id: 'professores', label: 'Professores', gestao: true },
  { id: 'dados', label: 'Dados', gestao: true },
];

function Indisponivel({ titulo, texto, voltar }: { titulo: string; texto: string; voltar: string }) {
  return <section className="admin-console-unavailable" role="alert"><h1>{titulo}</h1><p>{texto}</p><Link to={voltar}>Voltar</Link></section>;
}

/** Turma aberta no console: cabeçalho, abas por rota e o conteúdo da aba. */
function TurmaDetalhe({ escopo, turmaId, aba }: { escopo: EscopoTurmas; turmaId: number; aba: TurmaTab }) {
  const query = useCachedQuery(adminQueryKey('classes', escopo.empresaId, { turmaId, jornada: true }), () => obterJornada(turmaId));
  const [local, setLocal] = useState<JornadaEdicao | null>(null);
  useEffect(() => setLocal(null), [query.data]);
  const jornada = local ?? query.data;
  const abas = ABAS.filter((item) => escopo.gestao || !item.gestao);
  if (!abas.some((item) => item.id === aba)) return <Indisponivel titulo="Acesso indisponível" texto="Esta seção da turma é da gestão da escola." voltar={rotaTurma(escopo, turmaId, 'jornada')} />;
  if (query.loading && !jornada) return <section className="admin-console-unavailable" role="status">Carregando turma…</section>;
  if (!jornada) {
    const naoEncontrada = statusDoErro(query.error) === 404;
    return <section className="admin-console-unavailable" role="alert"><h1>{naoEncontrada ? 'Turma indisponível' : 'Não foi possível carregar a turma'}</h1>{!naoEncontrada && <AppButton variant="ghost" onClick={query.refetch}>Tentar novamente</AppButton>}<Link to={rotaTurma(escopo)}>Voltar às turmas</Link></section>;
  }
  const { turma } = jornada;
  return (
    <div className="admin-users-content turma-detalhe">
      <header className="turma-detalhe-header">
        <Link className="admin-console-back-link" to={rotaTurma(escopo)} aria-label="Voltar às turmas"><ArrowLeft size={15} aria-hidden="true" /><span>Turmas</span></Link>
        <div className="turma-detalhe-titulo">
          <h1>{turma.nome}</h1>
          <span>{turma.ano_letivo}</span>
          <span className={`turma-status ${turma.ativa ? 'is-active' : 'is-archived'}`}>{turma.ativa ? 'Ativa' : 'Arquivada'}</span>
        </div>
      </header>
      <nav className="turma-abas" aria-label="Seções da turma">
        {abas.map((item) => <Link key={item.id} to={rotaTurma(escopo, turmaId, item.id)} aria-current={item.id === aba ? 'page' : undefined} className={item.id === aba ? 'is-active' : undefined}>{item.label}</Link>)}
      </nav>
      {aba === 'jornada' && <TurmaJornadaTab turmaId={turmaId} empresaId={escopo.empresaId} jornada={jornada} onAtualizada={setLocal} />}
      {aba === 'alunos' && <TurmaAlunosTab escopo={escopo} turmaId={turmaId} ativa={turma.ativa} />}
      {aba === 'professores' && <TurmaProfessoresTab escopo={escopo} turmaId={turmaId} ativa={turma.ativa} />}
      {aba === 'dados' && <TurmaFormPage key={`${turma.id}:${turma.nome}:${turma.ano_letivo}:${turma.ativa}`} escopo={escopo} turma={turma} onSalvo={query.refetch} />}
    </div>
  );
}

/** Páginas de turma do console para gestão (admin/plataforma) e professor. */
export function TurmasPage({ escopo }: { escopo: EscopoTurmas }) {
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, '');
  const pagina = resolveConsolePage(path).id;
  if (pagina === 'classes') return <TurmasListPage escopo={escopo} />;
  if (pagina === 'new-class')
    return escopo.gestao ? <TurmaFormPage escopo={escopo} /> : <Indisponivel titulo="Acesso indisponível" texto="Turmas são criadas pela gestão da escola." voltar={rotaTurma(escopo)} />;
  const turmaId = turmaIdFromPath(path);
  if (pagina === 'class-detail' && turmaId) return <TurmaDetalhe key={turmaId} escopo={escopo} turmaId={turmaId} aba={turmaTabFromPath(path)} />;
  return <Indisponivel titulo="Página indisponível" texto="Esta página de turma não existe." voltar={rotaTurma(escopo)} />;
}
