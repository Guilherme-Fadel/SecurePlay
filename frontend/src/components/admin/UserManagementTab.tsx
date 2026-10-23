import { useDeferredValue, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Ban, CheckCircle2, Copy, KeyRound, RotateCcw, UsersRound, X } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { AdminListToolbar, AdminPageHeader, AdminPagination } from './AdminListLayout';
import { cn } from '@/lib/utils';
import { emitirLinkRedefinicaoAluno, inativarUsuario, listarUsuarios, reativarUsuario, type UsuarioEmpresa, type UsuariosPaginados } from '@/services/convites';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNotebookLayout } from '@/hooks/useNotebookLayout';
import { AdminDataGrid, type AdminDataGridColumn } from '@/components/admin/console/AdminDataGrid';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';

interface UserManagementTabProps { empresaId?: number; consoleMode?: boolean; }
const emptyResult: UsuariosPaginados = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };

export function UserManagementTab({ empresaId, consoleMode = false }: UserManagementTabProps) {
  const { user } = useCurrentUser();
  const notebook = useNotebookLayout();
  const pageSize = consoleMode ? 25 : notebook ? 4 : 25;
  const sessionKey = `secureplay-admin-users:${user?.userId ?? 'unknown'}:${empresaId ?? 'company'}`;
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<'active' | 'inactive' | 'management' | ''>('');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [updatingUser, setUpdatingUser] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const filters = { page, pageSize, search: deferredSearch, status: status || undefined, sort };
  const query = useCachedQuery(adminQueryKey('users', empresaId, filters), () => listarUsuarios(filters, empresaId), { enabled: restoredKey === sessionKey });
  const usuarios = query.data ?? emptyResult;
  const loading = query.loading;
  const loadError = Boolean(query.error);
  const [statusChange, setStatusChange] = useState<{ usuario: UsuarioEmpresa; action: 'inativar' | 'reativar'; empresaId?: number } | null>(null);
  const [reason, setReason] = useState('');
  const [resetLink, setResetLink] = useState<{ userId: number; value: string } | null>(null);
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
    if (query.data && page > Math.max(1, query.data.totalPages)) setPage(Math.max(1, query.data.totalPages));
  }, [page, query.data]);

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
      await (action === 'inativar'
        ? inativarUsuario(usuario.id, motivo, targetEmpresaId)
        : reativarUsuario(usuario.id, motivo, targetEmpresaId));
      if (currentEmpresaId.current === targetEmpresaId) {
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

  const columns: AdminDataGridColumn<UsuarioEmpresa>[] = [
    { key: 'user', label: 'Usuário', render: (usuario) => { const isManagement = usuario.role === 'admin' || usuario.role === 'platform_admin'; const roleLabel = usuario.role === 'admin' ? 'Administrador' : usuario.role === 'platform_admin' ? 'Gestão da plataforma' : ''; return <><strong>{isManagement ? usuario.name : usuario.nickname ?? usuario.name}</strong><small>{isManagement ? `${usuario.email ?? 'Sem e-mail'} · ${roleLabel}` : `${usuario.nickname ? `${usuario.name} · ` : ''}${usuario.email ?? 'Acesso por código da escola'}`}</small></>; } },
    { key: 'level', label: 'Nível', render: (usuario) => usuario.level },
    { key: 'status', label: 'Status', render: (usuario) => <span className={`admin-user-status ${usuario.active ? 'is-active' : 'is-inactive'}`}>{usuario.active ? 'Ativo' : 'Inativo'}</span> },
    { key: 'actions', label: 'Ações', className: 'admin-list-actions-heading', render: (usuario) => usuario.id !== user?.userId && usuario.role !== 'platform_admin' ? <div className="flex flex-wrap gap-1">{usuario.active ? <AppButton variant="ghost" size="sm" icon={<Ban size={14} />} disabled={updatingUser !== null || statusChange !== null} onClick={() => inativar(usuario)}>{updatingUser === usuario.id ? 'Salvando...' : 'Inativar'}</AppButton> : <AppButton variant="ghost" size="sm" icon={<RotateCcw size={14} />} disabled={updatingUser !== null || statusChange !== null} onClick={() => reativar(usuario)}>{updatingUser === usuario.id ? 'Salvando...' : 'Reativar'}</AppButton>}{!empresaId && usuario.active && usuario.role === 'user' && usuario.login_method === 'school_code' && <AppButton variant="ghost" size="sm" icon={<KeyRound size={14} />} disabled={updatingUser !== null || statusChange !== null} onClick={() => void emitirRedefinicao(usuario)}>Redefinir acesso</AppButton>}</div> : null },
  ];

  const emitirRedefinicao = async (usuario: UsuarioEmpresa) => {
    if (!window.confirm(`Gerar um link temporário para ${usuario.name}? O link permite definir uma nova senha e deve ser entregue diretamente ao aluno.`)) return;
    setUpdatingUser(usuario.id);
    setFeedback(null);
    setResetLink(null);
    try {
      const result = await emitirLinkRedefinicaoAluno(usuario.id, empresaId);
      setResetLink({ userId: usuario.id, value: `${window.location.origin}/recuperar-acesso#${result.reset_token}` });
      setFeedback(`Link temporário criado para ${usuario.name}. Ele expira em 20 minutos.`);
    } catch (error: any) {
      setFeedback(error.response?.data?.message ?? 'Não foi possível gerar o link de redefinição.');
    } finally { setUpdatingUser(null); }
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
      {resetLink && <div className="admin-user-reset-link" role="status">
        <div><strong>Link de redefinição</strong><small>Entregue diretamente ao aluno. Uso único; expira em 20 minutos.</small></div>
        <AppInput aria-label="Link temporário de redefinição" readOnly value={resetLink.value} />
        <AppButton type="button" size="sm" icon={<Copy size={14} />} onClick={() => void navigator.clipboard.writeText(resetLink.value)}>Copiar link</AppButton>
        <AppButton type="button" variant="ghost" size="sm" icon={<X size={14} />} aria-label="Fechar link de redefinição" onClick={() => setResetLink(null)}>Fechar</AppButton>
      </div>}
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
      <AdminDataGrid columns={columns} rows={usuarios.items} rowKey={(usuario) => usuario.id} loading={loading} error={loadError ? 'Não foi possível carregar os usuários.' : undefined} onRetry={query.refetch} empty="Nenhum usuário corresponde aos filtros." toolbar={<AdminListToolbar>
          <AppSearchInput label="Buscar usuários" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar nome, e-mail ou apelido" />
          <AppSelect aria-label="Filtrar usuários" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}>
            <option value="">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="management">Gerência</option>
          </AppSelect>
          <AppSelect aria-label="Ordenar usuários por nome" value={sort} onChange={(event) => { setSort(event.target.value as 'asc' | 'desc'); setPage(1); }}>
            <option value="asc">Nome A–Z</option><option value="desc">Nome Z–A</option>
          </AppSelect>
        </AdminListToolbar>} footer={!loading && !loadError ? <AdminPagination alwaysVisible={consoleMode} page={page} totalPages={usuarios.totalPages} ariaLabel="Paginação de usuários" onPageChange={setPage} /> : null} />
    </div>
  );
}
