import { useDeferredValue, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Ban, CheckCircle2, RotateCcw, UsersRound } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { AdminListCard, AdminListContent, AdminListState, AdminListToolbar, AdminPageHeader, AdminPagination } from './AdminListLayout';
import { cn } from '@/lib/utils';
import { inativarUsuario, listarUsuarios, reativarUsuario, type UsuarioEmpresa, type UsuariosPaginados } from '@/services/convites';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNotebookLayout } from '@/hooks/useNotebookLayout';

interface UserManagementTabProps { empresaId?: number; }
const emptyResult: UsuariosPaginados = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };

export function UserManagementTab({ empresaId }: UserManagementTabProps) {
  const { user } = useCurrentUser();
  const pageSize = useNotebookLayout() ? 4 : 25;
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
  const [updatingUser, setUpdatingUser] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const [statusChange, setStatusChange] = useState<{ usuario: UsuarioEmpresa; action: 'inativar' | 'reativar'; empresaId?: number } | null>(null);
  const [reason, setReason] = useState('');
  const currentEmpresaId = useRef(empresaId);
  currentEmpresaId.current = empresaId;

  useEffect(() => {
    setStatusChange(null);
    setReason('');
  }, [empresaId]);

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
    void listarUsuarios({ page, pageSize, search: deferredSearch, status: status || undefined, sort }, empresaId)
      .then((next) => {
        if (cancelled) return;
        if (page > Math.max(1, next.totalPages)) { setPage(Math.max(1, next.totalPages)); return; }
        setUsuarios(next);
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deferredSearch, empresaId, page, pageSize, reload, restoredKey, search, sessionKey, status, sort]);

  const solicitarAlteracao = (usuario: UsuarioEmpresa, action: 'inativar' | 'reativar') => {
    const confirmed = action === 'inativar'
      ? window.confirm(`Inativar o acesso de ${usuario.name}? Essa pessoa será desconectada e não poderá entrar novamente.`)
      : window.confirm(`Reativar o acesso de ${usuario.name}? A conta existente manterá os dados e a senha atuais.`);
    if (!confirmed) return;
    setStatusChange({ usuario, action, empresaId });
    setReason('');
    setFeedback(null);
  };

  const salvarAlteracao = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!statusChange) return;
    const { usuario, action, empresaId: targetEmpresaId } = statusChange;
    const motivo = reason.trim();
    if (motivo.length < 5 || motivo.length > 300) {
      setFeedback('Informe um motivo entre 5 e 300 caracteres.');
      return;
    }
    setUpdatingUser(usuario.id);
    try {
      const updated = action === 'inativar'
        ? await inativarUsuario(usuario.id, motivo, targetEmpresaId)
        : await reativarUsuario(usuario.id, motivo, targetEmpresaId);
      if (currentEmpresaId.current === targetEmpresaId) {
        setUsuarios((current) => ({ ...current, items: current.items.map((item) => item.id === usuario.id ? updated : item) }));
        setReload((current) => current + 1);
        setFeedback(action === 'inativar'
          ? 'Acesso inativado. Novas requisições dessa conta serão bloqueadas.'
          : 'Acesso reativado. O usuário poderá entrar com a conta existente.');
        setStatusChange(null);
        setReason('');
      }
    } catch (error: any) {
      if (currentEmpresaId.current === targetEmpresaId) {
        setFeedback(error.response?.data?.message ?? `Não foi possível ${action} o usuário.`);
      }
    } finally { setUpdatingUser(null); }
  };

  const inativar = (usuario: UsuarioEmpresa) => solicitarAlteracao(usuario, 'inativar');

  const reativar = (usuario: UsuarioEmpresa) => solicitarAlteracao(usuario, 'reativar');

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
      {statusChange && (
        <form className="admin-user-reason-form" onSubmit={(event) => void salvarAlteracao(event)}>
          <label htmlFor="user-status-reason">Motivo para {statusChange.action === 'inativar' ? 'inativar' : 'reativar'} {statusChange.usuario.name}</label>
          <AppInput
            id="user-status-reason"
            autoFocus
            required
            minLength={5}
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Informe um motivo (5 a 300 caracteres)"
            aria-describedby="user-status-reason-help"
            disabled={updatingUser !== null}
          />
          <small id="user-status-reason-help">Não inclua dados pessoais sensíveis. {reason.trim().length}/300</small>
          <div className="flex flex-wrap gap-2">
            <AppButton type="submit" size="sm" disabled={updatingUser !== null || reason.trim().length < 5}>
              {updatingUser !== null ? 'Salvando...' : 'Confirmar alteração'}
            </AppButton>
            <AppButton type="button" variant="ghost" size="sm" disabled={updatingUser !== null} onClick={() => { setStatusChange(null); setReason(''); }}>
              Cancelar
            </AppButton>
          </div>
        </form>
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
                  <td data-label="Ações">{usuario.id !== user?.userId && usuario.role !== 'platform_admin' && (usuario.active
                    ? <AppButton variant="ghost" size="sm" icon={<Ban size={14} />} disabled={updatingUser !== null || statusChange !== null} onClick={() => inativar(usuario)}>{updatingUser === usuario.id ? 'Inativando...' : 'Inativar'}</AppButton>
                    : <AppButton variant="ghost" size="sm" icon={<RotateCcw size={14} />} disabled={updatingUser !== null || statusChange !== null} onClick={() => reativar(usuario)}>{updatingUser === usuario.id ? 'Reativando...' : 'Reativar'}</AppButton>)}</td>
                </tr>;
              })}</tbody>
            </table></div>}
        </AdminListContent>
        {!loading && !loadError && <AdminPagination page={page} totalPages={usuarios.totalPages} ariaLabel="Paginação de usuários" onPageChange={setPage} />}
      </AdminListCard>
    </div>
  );
}
