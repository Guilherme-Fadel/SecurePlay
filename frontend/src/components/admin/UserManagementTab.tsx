import { useDeferredValue, useEffect, useState } from 'react';
import { AlertCircle, Ban, CheckCircle2, UsersRound } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { AdminListCard, AdminListContent, AdminListState, AdminListToolbar, AdminPageHeader, AdminPagination } from './AdminListLayout';
import { cn } from '@/lib/utils';
import { inativarUsuario, listarUsuarios, type UsuarioEmpresa, type UsuariosPaginados } from '@/services/convites';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface UserManagementTabProps { empresaId?: number; }
const emptyResult: UsuariosPaginados = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };

export function UserManagementTab({ empresaId }: UserManagementTabProps) {
  const { user } = useCurrentUser();
  const sessionKey = `secureplay-admin-users:${user?.userId ?? 'unknown'}:${empresaId ?? 'company'}`;
  const [usuarios, setUsuarios] = useState<UsuariosPaginados>(emptyResult);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<'active' | 'inactive' | 'management' | ''>('');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [deactivatingUser, setDeactivatingUser] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      if (saved) {
        const state = JSON.parse(saved) as { search?: string; status?: typeof status; sort?: 'asc' | 'desc'; page?: number };
        setSearch(state.search ?? '');
        setStatus(state.status ?? '');
        setSort(state.sort === 'desc' ? 'desc' : 'asc');
        setPage(typeof state.page === 'number' && Number.isInteger(state.page) && state.page > 0 ? state.page : 1);
      } else {
        setSearch(''); setStatus(''); setSort('asc'); setPage(1);
      }
    } catch {
      setSearch(''); setStatus(''); setSort('asc'); setPage(1);
    }
    setRestoredKey(sessionKey);
  }, [sessionKey]);

  useEffect(() => {
    if (restoredKey !== sessionKey || deferredSearch !== search) return;
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ search, status, sort, page })); } catch { /* Optional session preference. */ }
  }, [page, restoredKey, search, sessionKey, status, sort]);

  useEffect(() => {
    if (restoredKey !== sessionKey || deferredSearch !== search) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    void listarUsuarios({ page, search: deferredSearch, status: status || undefined, sort }, empresaId)
      .then((next) => {
        if (cancelled) return;
        if (page > Math.max(1, next.totalPages)) { setPage(Math.max(1, next.totalPages)); return; }
        setUsuarios(next);
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deferredSearch, empresaId, page, reload, restoredKey, search, sessionKey, status, sort]);

  const inativar = async (usuario: UsuarioEmpresa) => {
    if (!window.confirm(`Inativar o acesso de ${usuario.name}? Essa pessoa será desconectada e não poderá entrar novamente.`)) return;
    setDeactivatingUser(usuario.id);
    try {
      const updated = await inativarUsuario(usuario.id, empresaId);
      setUsuarios((current) => ({ ...current, items: current.items.map((item) => item.id === usuario.id ? updated : item) }));
      setReload((current) => current + 1);
      setFeedback('Acesso inativado. Novas requisições dessa conta serão bloqueadas.');
    } catch (error: any) {
      setFeedback(error.response?.data?.message ?? 'Não foi possível inativar o usuário.');
    } finally { setDeactivatingUser(null); }
  };

  return (
    <div className="admin-users-content">
      <AdminPageHeader
        title="Usuários"
        description="Pesquise, filtre e gerencie os acessos da empresa."
        count={loading || loadError ? undefined : usuarios.total}
        countLabel="usuários cadastrados"
        countIcon={<UsersRound size={18} />}
      />
      {feedback && (
        <div className={cn('admin-feedback', feedback.startsWith('Não foi') && 'is-error')} role={feedback.startsWith('Não foi') ? 'alert' : 'status'}>
          {feedback.startsWith('Não foi') ? <AlertCircle size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
          {feedback}
        </div>
      )}
      <AdminListCard loading={loading}>
        <AdminListToolbar>
          <AppSearchInput label="Buscar usuários" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar nome, e-mail ou apelido" />
          <AppSelect aria-label="Filtrar usuários" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}>
            <option value="">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="management">Gerência</option>
          </AppSelect>
          <AppSelect aria-label="Ordenar usuários por nome" value={sort} onChange={(event) => { setSort(event.target.value as 'asc' | 'desc'); setPage(1); }}>
            <option value="asc">Nome A–Z</option><option value="desc">Nome Z–A</option>
          </AppSelect>
        </AdminListToolbar>
        <AdminListContent>
          {loading ? <AdminListState kind="loading">Carregando usuários...</AdminListState>
            : loadError ? <AdminListState kind="error" onRetry={() => setReload((current) => current + 1)}>Não foi possível carregar os usuários.</AdminListState>
            : usuarios.items.length === 0 ? <AdminListState kind="empty">Nenhum usuário corresponde aos filtros.</AdminListState>
            : <div className="admin-list-table-wrap"><table className="admin-list-table">
              <thead><tr><th>Usuário</th><th>Nível</th><th>Status</th><th className="admin-list-actions-heading"><span className="sr-only">Ações</span></th></tr></thead>
              <tbody>{usuarios.items.map((usuario) => {
                const isManagement = usuario.role === 'admin' || usuario.role === 'platform_admin';
                const roleLabel = usuario.role === 'admin' ? 'Administrador' : usuario.role === 'platform_admin' ? 'Gestão da plataforma' : '';
                return <tr key={usuario.id} className={usuario.active ? '' : 'is-inactive'}>
                  <td data-label="Usuário"><strong>{isManagement ? usuario.name : usuario.nickname ?? usuario.name}</strong><small>{isManagement ? `${usuario.email} · ${roleLabel}` : `${usuario.nickname ? `${usuario.name} · ` : ''}${usuario.email}`}</small></td>
                  <td data-label="Nível">{usuario.level}</td>
                  <td data-label="Status"><span className={`admin-user-status ${usuario.active ? 'is-active' : 'is-inactive'}`}>{usuario.active ? 'Ativo' : 'Inativo'}</span></td>
                  <td data-label="Ações">{usuario.active && usuario.id !== user?.userId && usuario.role !== 'platform_admin' && <AppButton variant="ghost" size="sm" icon={<Ban size={14} />} disabled={deactivatingUser === usuario.id} onClick={() => void inativar(usuario)}>{deactivatingUser === usuario.id ? 'Inativando...' : 'Inativar'}</AppButton>}</td>
                </tr>;
              })}</tbody>
            </table></div>}
        </AdminListContent>
        {!loading && !loadError && <AdminPagination page={page} totalPages={usuarios.totalPages} ariaLabel="Paginação de usuários" onPageChange={setPage} />}
      </AdminListCard>
    </div>
  );
}
