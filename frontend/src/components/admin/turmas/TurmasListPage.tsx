import { useDeferredValue, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { AdminListToolbar, AdminPageHeader } from '@/components/admin/AdminListLayout';
import { AdminDataGrid, type AdminDataGridColumn } from '@/components/admin/console/AdminDataGrid';
import { AdminGridPagination } from '@/components/admin/console/AdminGridPagination';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { formatarAbertura } from '@/lib/brasiliaTime';
import { listarTurmas, minhasTurmas, type TurmaResumo } from '@/services/turmas';
import { anosLetivos, rotaTurma, type EscopoTurmas } from './turmaUi';
import './turmas.css';

function colunas(escopo: EscopoTurmas, abrir: (turma: TurmaResumo) => void): AdminDataGridColumn<TurmaResumo>[] {
  return [
    { key: 'nome', label: 'Turma', render: (turma) => <button type="button" className="turma-link" onClick={() => abrir(turma)}>{turma.nome}</button> },
    { key: 'ano', label: 'Ano letivo', render: (turma) => turma.ano_letivo },
    ...(escopo.gestao ? [{ key: 'professores', label: 'Professores', render: (turma: TurmaResumo) => turma.professores }] : []),
    { key: 'alunos', label: 'Alunos', render: (turma) => turma.alunos },
    { key: 'proxima', label: 'Próxima abertura', render: (turma) => (turma.proxima_abertura ? formatarAbertura(turma.proxima_abertura) : '—') },
    { key: 'situacao', label: 'Situação', render: (turma) => <span className={`turma-status ${turma.ativa ? 'is-active' : 'is-archived'}`}>{turma.ativa ? 'Ativa' : 'Arquivada'}</span> },
  ];
}

/** Turmas da escola para admin e plataforma, com busca, filtros e paginação. */
function TurmasDaEscola({ escopo }: { escopo: EscopoTurmas }) {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const buscaAdiada = useDeferredValue(busca);
  const [ano, setAno] = useState('');
  const [situacao, setSituacao] = useState<'ativa' | 'arquivada' | ''>('ativa');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const filtros = {
    page,
    pageSize,
    busca: buscaAdiada.trim() || undefined,
    ano_letivo: ano ? Number(ano) : undefined,
    situacao: situacao || undefined,
  };
  const query = useCachedQuery(adminQueryKey('classes', escopo.empresaId, filtros), () => listarTurmas(filtros, escopo.empresaId), { keepPreviousDataOnInvalidate: true });
  const resultado = query.data ?? { items: [], page: 1, pageSize, total: 0, totalPages: 0 };
  const abrir = (turma: TurmaResumo) => navigate(rotaTurma(escopo, turma.id, 'jornada'));
  return (
    <div className="admin-users-content">
      <AdminPageHeader title="Turmas" description="Organize as turmas da escola, vincule professores e alunos. A jornada e as aberturas de aula ficam dentro de cada turma." />
      <AdminDataGrid
        columns={colunas(escopo, abrir)}
        rows={resultado.items}
        rowKey={(turma) => turma.id}
        onOpenRow={abrir}
        loading={query.loading}
        error={query.error ? 'Não foi possível carregar as turmas.' : undefined}
        onRetry={query.refetch}
        empty={busca || ano || situacao !== 'ativa' ? 'Nenhuma turma corresponde aos filtros.' : 'Nenhuma turma cadastrada ainda.'}
        toolbar={<AdminListToolbar actions={<Link className="admin-console-primary-link" to={`${rotaTurma(escopo)}/nova`}><Plus size={16} aria-hidden="true" />Nova turma</Link>}>
          <AppSearchInput label="Buscar turmas" value={busca} onChange={(event) => { setBusca(event.target.value); setPage(1); }} placeholder="Buscar pelo nome da turma" />
          <AppSelect aria-label="Filtrar por ano letivo" value={ano} onChange={(event) => { setAno(event.target.value); setPage(1); }}>
            <option value="">Todos os anos</option>
            {anosLetivos().map((item) => <option key={item} value={String(item)}>{item}</option>)}
          </AppSelect>
          <AppSelect aria-label="Filtrar por situação" value={situacao} onChange={(event) => { setSituacao(event.target.value as typeof situacao); setPage(1); }}>
            <option value="ativa">Ativas</option>
            <option value="arquivada">Arquivadas</option>
            <option value="">Todas</option>
          </AppSelect>
        </AdminListToolbar>}
        footer={!query.loading && !query.error ? <AdminGridPagination page={page} pageSize={pageSize} total={resultado.total} totalPages={resultado.totalPages} ariaLabel="Paginação de turmas" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /> : null}
      />
    </div>
  );
}

/** Turmas do professor; com uma só, abre direto a jornada dela. */
function MinhasTurmas({ escopo }: { escopo: EscopoTurmas }) {
  const navigate = useNavigate();
  const query = useCachedQuery(adminQueryKey('classes', undefined, { minhas: true }), minhasTurmas);
  const turmas = query.data ?? [];
  if (!query.loading && !query.error && turmas.length === 1) return <Navigate to={rotaTurma(escopo, turmas[0].id, 'jornada')} replace />;
  const abrir = (turma: TurmaResumo) => navigate(rotaTurma(escopo, turma.id, 'jornada'));
  return (
    <div className="admin-users-content">
      <AdminPageHeader title="Minhas turmas" description="Escolha a turma para abrir aulas, agendar aberturas e ver os alunos." />
      <AdminDataGrid
        columns={colunas(escopo, abrir)}
        rows={turmas}
        rowKey={(turma) => turma.id}
        onOpenRow={abrir}
        loading={query.loading}
        error={query.error ? 'Não foi possível carregar suas turmas.' : undefined}
        onRetry={query.refetch}
        empty="Você ainda não está em nenhuma turma. Peça ao administrador da escola para vincular você."
      />
    </div>
  );
}

export function TurmasListPage({ escopo }: { escopo: EscopoTurmas }) {
  return escopo.gestao ? <TurmasDaEscola escopo={escopo} /> : <MinhasTurmas escopo={escopo} />;
}
