import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { useDeferredValue, useEffect, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, X } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { AdminListToolbar, AdminPageHeader, AdminPagination } from './AdminListLayout';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNotebookLayout } from '@/hooks/useNotebookLayout';
import { AdminDataGrid, type AdminDataGridColumn } from '@/components/admin/console/AdminDataGrid';
import {
  aprovarApelido,
  listarApelidosPendentes,
  rejeitarApelido,
  type ApelidosPendentesPaginados,
} from '@/services/convites';

interface PendingNicknamesTabProps {
  empresaId?: number;
  consoleMode?: boolean;
}

const emptyResult: ApelidosPendentesPaginados = {
  items: [], page: 1, pageSize: 25, total: 0, totalPages: 0,
};

export function PendingNicknamesTab({ empresaId, consoleMode = false }: PendingNicknamesTabProps) {
  const { user } = useCurrentUser();
  const notebook = useNotebookLayout();
  const pageSize = consoleMode ? 25 : notebook ? 4 : 25;
  const sessionKey = `secureplay-admin-nicknames:${user?.userId ?? 'unknown'}:${empresaId ?? 'company'}`;
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'default' | 'asc' | 'desc'>('default');
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);




  const [reviewing, setReviewing] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      const state = saved ? JSON.parse(saved) as { search?: string; sort?: 'default' | 'asc' | 'desc'; page?: number } : {};
      setSearch(state.search ?? '');
      setSort(state.sort === 'asc' || state.sort === 'desc' ? state.sort : 'default');
      setPage(typeof state.page === 'number' && Number.isInteger(state.page) && state.page > 0 ? state.page : 1);
    } catch {
      setSearch(''); setSort('default'); setPage(1);
    }
    setRestoredKey(sessionKey);
  }, [sessionKey]);

  useEffect(() => {
    if (restoredKey !== sessionKey || deferredSearch !== search) return;
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ search, sort, page })); } catch { /* Optional session preference. */ }
  }, [page, restoredKey, search, sessionKey, sort]);

  const filters = { page, pageSize, search: deferredSearch, sort };
  const query = useCachedQuery(adminQueryKey('nicknames', empresaId, filters), () => listarApelidosPendentes(filters, empresaId), { enabled: restoredKey === sessionKey });
  const result = query.data ?? emptyResult;
  const loading = query.loading;
  const loadError = Boolean(query.error);
  useEffect(() => { if (query.data && page > Math.max(1, query.data.totalPages)) setPage(Math.max(1, query.data.totalPages)); }, [page, query.data]);

  const revisar = async (usuarioId: number, aprovado: boolean) => {
    setReviewing(usuarioId);
    setFeedback(null);
    try {
      await (aprovado
        ? aprovarApelido(usuarioId, empresaId)
        : rejeitarApelido(usuarioId, empresaId));

      setFeedback(aprovado ? 'Apelido aprovado e liberado no ranking.' : 'Pedido de apelido recusado.');
    } catch (error: any) {
      setFeedback(error.response?.data?.message ?? 'Não foi possível revisar o apelido.');
    } finally {
      setReviewing(null);
    }
  };

  const columns: AdminDataGridColumn<ApelidosPendentesPaginados['items'][number]>[] = [
    { key: 'nickname', label: 'Apelido solicitado', render: (usuario) => <strong className="admin-nickname-value">{usuario.nickname_pending}</strong> },
    { key: 'name', label: 'Participante', render: (usuario) => usuario.name },
    { key: 'email', label: 'E-mail', render: (usuario) => usuario.email ?? 'Acesso por código da escola' },
    { key: 'actions', label: 'Ações', render: (usuario) => <div className="admin-nickname-actions"><AppButton size="sm" icon={<Check size={14} />} disabled={reviewing === usuario.id} onClick={() => void revisar(usuario.id, true)}>Aprovar</AppButton><AppButton variant="ghost" size="sm" icon={<X size={14} />} disabled={reviewing === usuario.id} onClick={() => void revisar(usuario.id, false)}>Recusar</AppButton></div> },
  ];

  return (
    <div className="admin-users-content">
      <AdminPageHeader
        title="Apelidos pendentes"
        description="Revise os apelidos antes que sejam exibidos no ranking da turma."
        count={loading || loadError ? undefined : result.total}
        countLabel="aguardando revisão"
        countIcon={<CheckCircle2 size={18} />}
      />
      {feedback && <div className={cn('admin-feedback', feedback.startsWith('Não foi') && 'is-error')} role={feedback.startsWith('Não foi') ? 'alert' : 'status'}>
        {feedback.startsWith('Não foi') ? <AlertCircle size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}{feedback}
      </div>}
      <AdminDataGrid columns={columns} rows={result.items} rowKey={(usuario) => usuario.id} loading={loading} error={loadError ? 'Não foi possível carregar os apelidos pendentes.' : undefined} onRetry={query.refetch} empty={search ? 'Nenhum apelido pendente corresponde à busca.' : 'Não há apelidos aguardando revisão.'} toolbar={<AdminListToolbar>
          <AppSearchInput label="Buscar apelidos pendentes" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por nome, e-mail ou apelido" />
          <AppSelect aria-label="Ordenar apelidos pendentes" value={sort} onChange={(event) => { setSort(event.target.value as 'default' | 'asc' | 'desc'); setPage(1); }}>
            <option value="default">Ordem padrão</option>
            <option value="asc">Apelido A–Z</option>
            <option value="desc">Apelido Z–A</option>
          </AppSelect>
        </AdminListToolbar>} footer={!loading && !loadError ? <AdminPagination alwaysVisible={consoleMode} page={page} totalPages={result.totalPages} ariaLabel="Paginação de apelidos pendentes" onPageChange={setPage} /> : null} />
    </div>
  );
}
