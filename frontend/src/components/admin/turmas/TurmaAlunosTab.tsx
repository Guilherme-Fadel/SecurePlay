import { useDeferredValue, useState } from 'react';
import { AlertCircle, UserPlus } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { Modal } from '@/components/ui/modal';
import { AdminListToolbar } from '@/components/admin/AdminListLayout';
import { AdminDataGrid } from '@/components/admin/console/AdminDataGrid';
import { AdminGridPagination } from '@/components/admin/console/AdminGridPagination';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { listarUsuarios } from '@/services/convites';
import { adicionarAlunosTurma, listarAlunosDaJornada, listarAlunosTurma, removerAlunoTurma, type AlunoDaTurma } from '@/services/turmas';
import { mensagemDeErro, type EscopoTurmas } from './turmaUi';

function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

/** Modal de inclusão: alunos sem turma ou de outra turma (que serão movidos). */
function AdicionarAlunos({ escopo, turmaId, onClose, onAdicionados }: { escopo: EscopoTurmas; turmaId: number; onClose: () => void; onAdicionados: (resumo: string) => void }) {
  const [origem, setOrigem] = useState<'nenhuma' | 'todos'>('nenhuma');
  const [busca, setBusca] = useState('');
  const buscaAdiada = useDeferredValue(busca);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const filtros = { page: 1, pageSize: 100, papel: 'user' as const, search: buscaAdiada, ...(origem === 'nenhuma' ? { turma: 'nenhuma' as const } : {}) };
  const candidatos = useCachedQuery(adminQueryKey('users', escopo.empresaId, filtros), () => listarUsuarios(filtros, escopo.empresaId));
  const itens = (candidatos.data?.items ?? []).filter((aluno) => aluno.turma?.id !== turmaId);
  const alternar = (id: number) => setMarcados((atual) => { const proximo = new Set(atual); if (proximo.has(id)) proximo.delete(id); else proximo.add(id); return proximo; });
  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const { adicionados, movidos } = await adicionarAlunosTurma(turmaId, [...marcados], escopo.empresaId);
      onAdicionados(`${adicionados} aluno(s) adicionado(s)${movidos ? ` e ${movidos} movido(s) de outra turma` : ''}.`);
    } catch (error) {
      setErro(mensagemDeErro(error, 'Não foi possível adicionar os alunos.'));
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Adicionar alunos" maxWidth="560px">
      {erro && <div className="admin-feedback is-error" role="alert"><AlertCircle size={17} aria-hidden="true" />{erro}</div>}
      <div className="turma-add-toolbar">
        <AppSelect aria-label="Mostrar alunos" value={origem} onChange={(event) => { setOrigem(event.target.value as typeof origem); setMarcados(new Set()); }}>
          <option value="nenhuma">Sem turma</option>
          <option value="todos">Todos os alunos (move de outra turma)</option>
        </AppSelect>
        <AppSearchInput label="Buscar alunos" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar pelo nome" />
      </div>
      <fieldset className="turma-add-list" disabled={salvando}>
        <legend className="sr-only">Alunos para adicionar</legend>
        {candidatos.loading ? <p role="status">Carregando alunos…</p>
          : candidatos.error ? <p role="alert">Não foi possível carregar os alunos. <AppButton variant="ghost" size="sm" onClick={candidatos.refetch}>Tentar novamente</AppButton></p>
          : !itens.length ? <p>{origem === 'nenhuma' ? 'Todos os alunos já estão em uma turma.' : 'Nenhum aluno encontrado.'}</p>
          : itens.map((aluno) => (
            <label key={aluno.id} className="turma-add-item">
              <input type="checkbox" checked={marcados.has(aluno.id)} onChange={() => alternar(aluno.id)} />
              <span>{aluno.nickname ? `${aluno.name} (${aluno.nickname})` : aluno.name}</span>
              {aluno.turma && <small>em {aluno.turma.nome}</small>}
            </label>
          ))}
      </fieldset>
      <div className="admin-console-setting-actions">
        <AppButton variant="ghost" onClick={onClose}>Cancelar</AppButton>
        <AppButton disabled={!marcados.size || salvando} onClick={() => void salvar()}>{salvando ? 'Adicionando…' : `Adicionar ${marcados.size || ''}`.trim()}</AppButton>
      </div>
    </Modal>
  );
}

/** Alunos da turma: gestão adiciona, move e retira; professor só consulta. */
export function TurmaAlunosTab({ escopo, turmaId, ativa }: { escopo: EscopoTurmas; turmaId: number; ativa: boolean }) {
  const [busca, setBusca] = useState('');
  const buscaAdiada = useDeferredValue(busca);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [adicionando, setAdicionando] = useState(false);
  const [retirar, setRetirar] = useState<AlunoDaTurma | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const filtros = { page, pageSize, busca: buscaAdiada.trim() || undefined };
  const query = useCachedQuery(adminQueryKey('classes', escopo.empresaId, { turmaId, alunos: filtros, gestao: escopo.gestao }), () => (escopo.gestao ? listarAlunosTurma(turmaId, filtros, escopo.empresaId) : listarAlunosDaJornada(turmaId, filtros)));
  const resultado = query.data ?? { items: [], page: 1, pageSize, total: 0, totalPages: 0 };
  const confirmarRetirada = async () => {
    const alvo = retirar;
    setRetirar(null);
    if (!alvo) return;
    setErro(null);
    try {
      await removerAlunoTurma(turmaId, alvo.id, escopo.empresaId);
      setAviso(`${alvo.name} saiu da turma e volta à jornada geral, sem perder progresso.`);
      query.refetch();
    } catch (error) {
      setErro(mensagemDeErro(error, 'Não foi possível retirar o aluno.'));
    }
  };
  return (
    <section aria-label="Alunos da turma">
      {aviso && <div className="admin-feedback" role="status">{aviso}</div>}
      {erro && <div className="admin-feedback is-error" role="alert"><AlertCircle size={17} aria-hidden="true" />{erro}</div>}
      <AdminDataGrid
        columns={[
          { key: 'nome', label: 'Aluno', render: (aluno) => aluno.name },
          { key: 'apelido', label: 'Apelido', render: (aluno) => aluno.nickname ?? '—' },
          { key: 'entrada', label: 'Na turma desde', render: (aluno) => dataCurta(aluno.entrou_em) },
          ...(escopo.gestao ? [{ key: 'acoes', label: 'Ações', render: (aluno: AlunoDaTurma) => <AppButton variant="ghost" size="sm" onClick={() => setRetirar(aluno)}>Retirar</AppButton> }] : []),
        ]}
        rows={resultado.items}
        rowKey={(aluno) => aluno.id}
        loading={query.loading}
        error={query.error ? 'Não foi possível carregar os alunos.' : undefined}
        onRetry={query.refetch}
        empty={busca ? 'Nenhum aluno corresponde à busca.' : 'Nenhum aluno nesta turma ainda.'}
        toolbar={<AdminListToolbar actions={escopo.gestao && ativa ? <AppButton size="control" icon={<UserPlus size={15} aria-hidden="true" />} onClick={() => setAdicionando(true)}>Adicionar alunos</AppButton> : undefined}>
          <AppSearchInput label="Buscar alunos da turma" value={busca} onChange={(event) => { setBusca(event.target.value); setPage(1); }} placeholder="Buscar pelo nome ou apelido" />
        </AdminListToolbar>}
        footer={!query.loading && !query.error ? <AdminGridPagination page={page} pageSize={pageSize} total={resultado.total} totalPages={resultado.totalPages} ariaLabel="Paginação de alunos da turma" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /> : null}
      />
      {adicionando && <AdicionarAlunos escopo={escopo} turmaId={turmaId} onClose={() => setAdicionando(false)} onAdicionados={(resumo) => { setAdicionando(false); setAviso(resumo); query.refetch(); }} />}
      <Modal open={retirar !== null} onClose={() => setRetirar(null)} title="Retirar aluno da turma?" maxWidth="440px">
        <p>{retirar?.name} volta à jornada geral da escola. O progresso, o XP e as conquistas continuam.</p>
        <div className="admin-console-setting-actions">
          <AppButton variant="ghost" onClick={() => setRetirar(null)}>Cancelar</AppButton>
          <AppButton onClick={() => void confirmarRetirada()}>Retirar</AppButton>
        </div>
      </Modal>
    </section>
  );
}
