import { atualizarUsuarioAdministrativo, obterPropriosDadosPlataforma, type UpdateAdminUser } from '@/services/convites';
import { AdminFeedback } from './console/AdminFeedback';
import { useDeferredValue, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Ban, Copy, KeyRound, Pencil, Plus, RotateCcw, UsersRound, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { AdminListToolbar, AdminPageHeader, AdminPagination } from './AdminListLayout';
import { emitirLinkRedefinicaoAluno, inativarUsuario, listarUsuarios, obterUsuario, reativarUsuario, type UsuarioEmpresa, type UsuariosPaginados } from '@/services/convites';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNotebookLayout } from '@/hooks/useNotebookLayout';
import { AdminDataGrid, type AdminDataGridColumn } from '@/components/admin/console/AdminDataGrid';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { useAdminUnsavedChanges } from '@/hooks/useAdminUnsavedChanges';
import { AdminRecordCard } from '@/components/admin/console/AdminRecordCard';
import { AdminGridPagination } from '@/components/admin/console/AdminGridPagination';
import { normalizeAdminListFilters } from '@/hooks/useAdminListFilters';

interface UserManagementTabProps { empresaId?: number; consoleMode?: boolean; usuarioId?: number; }
const emptyResult: UsuariosPaginados = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };

export function UserManagementTab({ empresaId, consoleMode = false, usuarioId }: UserManagementTabProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const listPath = empresaId ? `/admin/empresas/${empresaId}/pessoas/usuarios` : '/admin/pessoas/usuarios';
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const openUser = (usuario: UsuarioEmpresa) => navigate(`${listPath}/${usuario.id}/editar`, { state: { selectedId: usuario.id } });
  const { user, setSession } = useCurrentUser();
  const notebook = useNotebookLayout();
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const pageSize = consoleMode ? recordsPerPage : notebook ? 4 : 25;
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
  const query = useCachedQuery(adminQueryKey('users', empresaId, filters), () => listarUsuarios(filters, empresaId), { enabled: !usuarioId && restoredKey === sessionKey });
  const detail = useCachedQuery(adminQueryKey('users', empresaId, { id: usuarioId }), () => user?.role === 'platform_admin' && !empresaId ? obterPropriosDadosPlataforma(usuarioId ?? 0) : obterUsuario(usuarioId ?? 0, empresaId), { enabled: Boolean(usuarioId) });
  const usuarios = query.data ?? emptyResult;
  const loading = query.loading;
  const loadError = Boolean(query.error);
  const [statusChange, setStatusChange] = useState<{ usuario: UsuarioEmpresa; action: 'inativar' | 'reativar'; empresaId?: number } | null>(null);
  const [reason, setReason] = useState('');
  const [resetLink, setResetLink] = useState<{ userId: number; value: string } | null>(null);
  const [draft, setDraft] = useState<{ name: string; email: string; nickname: string; level: number; role: string } | null>(null);
  const [baseline, setBaseline] = useState<typeof draft>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const recordDirty = Boolean(draft && baseline && JSON.stringify(draft) !== JSON.stringify(baseline));
  const recordDirtyRef = useRef(recordDirty);
  recordDirtyRef.current = recordDirty;
  const canEditRecord = Boolean(detail.data && (user?.role === 'platform_admin' ? detail.data.role !== 'platform_admin' || detail.data.id === user.userId : detail.data.id !== user?.userId && detail.data.role !== 'platform_admin'));
  const fillDraft = (record: UsuarioEmpresa) => ({ name: record.name, email: record.email ?? '', nickname: record.nickname ?? '', level: record.level, role: record.role });
  useEffect(() => { if (detail.data && !recordDirtyRef.current) { const next = fillDraft(detail.data); setDraft(next); setBaseline(next); } }, [detail.data]);
  const saveRecord = async () => {
    if (!draft || !baseline || !usuarioId || !canEditRecord || !recordDirty || savingRecord || !formRef.current?.reportValidity()) return false;
    const changes: UpdateAdminUser = {};
    if (draft.name !== baseline.name) changes.name = draft.name.trim();
    if (draft.email !== baseline.email) changes.email = draft.email.trim() || null;
    if (draft.nickname !== baseline.nickname) changes.nickname = draft.nickname.trim() || null;
    if (draft.level !== baseline.level) changes.level = draft.level;
    if (draft.role !== baseline.role && (draft.role === 'admin' || draft.role === 'user')) changes.role = draft.role;
    setSavingRecord(true); setFeedback(null);
    try {
      const saved = await atualizarUsuarioAdministrativo(usuarioId, changes, empresaId, user?.role === 'platform_admin');
      const next = fillDraft(saved); setDraft(next); setBaseline(next);
      if (user?.userId === saved.id) setSession({ ...user, name: saved.name, email: saved.email, nickname: saved.nickname, level: saved.level });
      setFeedback('Dados do usuário atualizados.'); return true;
    } catch (error: any) { setFeedback(`Não foi possível salvar: ${error.response?.data?.message ?? 'confira os dados e tente novamente.'}`); return false; }
    finally { setSavingRecord(false); }
  };
  const { prompt: unsavedPrompt } = useAdminUnsavedChanges(consoleMode && (Boolean(statusChange) || recordDirty), recordDirty ? saveRecord : undefined, consoleMode && (updatingUser !== null || savingRecord));
  const currentEmpresaId = useRef(empresaId);
  currentEmpresaId.current = empresaId;

  useEffect(() => {
    setStatusChange(null);
    setReason('');
  }, [empresaId, usuarioId]);

  useEffect(() => { setSelectedId(location.state?.selectedId ?? null); }, [location.state]);

  useEffect(() => {
    if (query.data && selectedId !== null && !query.data.items.some((item) => item.id === selectedId)) setSelectedId(null);
  }, [query.data, selectedId]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      if (saved) {
        const state = JSON.parse(saved) as { search?: string; status?: typeof status; sort?: 'asc' | 'desc'; page?: number; pageSize?: number };
        setRecordsPerPage(normalizeAdminListFilters({ pageSize: state.pageSize }).pageSize);
        setSearch(state.search ?? '');
        setStatus(state.status ?? '');
        setSort(state.sort === 'desc' ? 'desc' : 'asc');
        setPage(typeof state.page === 'number' && Number.isInteger(state.page) && state.page > 0 ? state.page : 1);
      } else {
        setSearch(''); setStatus(''); setSort('asc'); setPage(1); setRecordsPerPage(25);
      }
    } catch {
      setSearch(''); setStatus(''); setSort('asc'); setPage(1); setRecordsPerPage(25);
    }
    setRestoredKey(sessionKey);
  }, [sessionKey]);

  useEffect(() => {
    if (restoredKey !== sessionKey || deferredSearch !== search) return;
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ search, status, sort, page, pageSize: recordsPerPage })); } catch { /* Optional session preference. */ }
  }, [deferredSearch, page, recordsPerPage, restoredKey, search, sessionKey, status, sort]);

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
    { key: 'name', label: 'Nome', render: (usuario) => <><strong>{usuario.name}</strong>{usuario.role === 'admin' && <small>Administrador</small>}{usuario.role === 'platform_admin' && <small>Gestão da plataforma</small>}</> },
    { key: 'nickname', label: 'Apelido', render: (usuario) => usuario.nickname || '—' },
    { key: 'username', label: 'Usuário de acesso', render: (usuario) => usuario.username || '—' },
    { key: 'email', label: 'E-mail', width: 'minmax(0, 1.3fr)', render: (usuario) => usuario.email || (usuario.login_method === 'school_code' ? 'Acesso por código da escola' : 'Sem e-mail') },
    { key: 'level', label: 'Nível', render: (usuario) => usuario.level },
    { key: 'status', label: 'Status', render: (usuario) => <span className={`admin-user-status ${usuario.active ? 'is-active' : 'is-inactive'}`}>{usuario.active ? 'Ativo' : 'Inativo'}</span> },
    { key: 'actions', label: 'Ações', className: 'admin-list-actions-heading', render: (usuario) => usuario.id !== user?.userId && usuario.role !== 'platform_admin' ? <div className="flex flex-wrap gap-1">{usuario.active ? <AppButton variant="ghost" size="sm" icon={<Ban size={14} />} disabled={updatingUser !== null || statusChange !== null} onClick={() => inativar(usuario)}>{updatingUser === usuario.id ? 'Salvando...' : 'Inativar'}</AppButton> : <AppButton variant="ghost" size="sm" icon={<RotateCcw size={14} />} disabled={updatingUser !== null || statusChange !== null} onClick={() => reativar(usuario)}>{updatingUser === usuario.id ? 'Salvando...' : 'Reativar'}</AppButton>}{!empresaId && usuario.active && usuario.role === 'user' && !usuario.email && (usuario.username || usuario.login_method === 'school_code') && <AppButton variant="ghost" size="sm" icon={<KeyRound size={14} />} disabled={updatingUser !== null || statusChange !== null} onClick={() => void emitirRedefinicao(usuario)}>Redefinir acesso</AppButton>}</div> : null },
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
      {unsavedPrompt}
      <AdminPageHeader
        title={usuarioId ? 'Gerenciar usuário' : 'Usuários'}
        description="Pesquise, filtre e gerencie os acessos da empresa."
        count={usuarioId || loading || loadError ? undefined : usuarios.total}
        countLabel="usuários cadastrados"
        countIcon={<UsersRound size={18} />}
        action={usuarioId ? <Link className="admin-console-back-link" to={typeof location.state?.returnTo === 'string' && location.state.returnTo.startsWith('/admin/') ? location.state.returnTo : listPath} state={{ selectedId: usuarioId }}><ArrowLeft size={16} /> Voltar</Link> : undefined}
      />
      {feedback && (
        <AdminFeedback variant={feedback.startsWith('Não foi') || feedback.startsWith('Informe') ? 'error' : 'success'}>{feedback}</AdminFeedback>
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
      {usuarioId ? <AdminRecordCard className="admin-user-editor" busy={detail.loading}>
        {detail.loading ? <p role="status">Carregando usuário…</p> : detail.error || !detail.data ? <div role="alert"><p>Não foi possível carregar este usuário na empresa.</p><AppButton onClick={detail.refetch}>Tentar novamente</AppButton></div> : <>
          <header><h2>{detail.data.name}</h2><span className={`admin-user-status ${detail.data.active ? 'is-active' : 'is-inactive'}`}>{detail.data.active ? 'Ativo' : 'Inativo'}</span></header>
          {draft && <form ref={formRef} className="admin-user-edit-form" onSubmit={event => { event.preventDefault(); void saveRecord(); }}>
            <fieldset className="admin-form-grid" disabled={!canEditRecord || savingRecord}>
              <label className="admin-console-setting-field"><span>Nome</span><AppInput value={draft.name} minLength={2} maxLength={100} required onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
              <label className="admin-console-setting-field"><span>Usuário de acesso</span><AppInput readOnly value={detail.data.username ?? ''} placeholder="Não definido" /></label>
              <label className="admin-console-setting-field"><span>Telefone</span><AppInput readOnly value={detail.data.phone ?? ''} placeholder="Não informado" /></label>
              <label className="admin-console-setting-field"><span>E-mail</span><AppInput type="email" value={draft.email} maxLength={100} required={detail.data.login_method === 'email' || Boolean(detail.data.username && detail.data.email)} onChange={event => setDraft({ ...draft, email: event.target.value })} /></label>
              <label className="admin-console-setting-field"><span>Apelido</span><AppInput value={draft.nickname} minLength={2} maxLength={24} onChange={event => setDraft({ ...draft, nickname: event.target.value })} /></label>
              <label className="admin-console-setting-field"><span>Perfil</span><AppSelect aria-label="Perfil" value={draft.role} disabled={!canEditRecord || savingRecord || draft.role === 'platform_admin'} onChange={event => setDraft({ ...draft, role: event.target.value })}><option value="user">Aluno</option><option value="admin">Administrador</option>{draft.role === 'platform_admin' && <option value="platform_admin">Administrador da plataforma</option>}</AppSelect></label>
              <label className="admin-console-setting-field"><span>Nível</span><input className="app-text-input" type="number" value={draft.level} min={1} max={100000} required onChange={event => setDraft({ ...draft, level: Number(event.target.value) })} /></label>
            </fieldset>
            {!canEditRecord && <p role="status">Somente o administrador da plataforma pode editar os próprios dados. Contas da plataforma são editadas pelo próprio titular.</p>}
            <div className="admin-user-editor-footer">
              <div className="admin-user-access-actions">{columns.find((column) => column.key === 'actions')?.render(detail.data)}</div>
              <div className="admin-console-setting-actions"><AppButton variant="ghost" disabled={!recordDirty || savingRecord} onClick={() => setDraft(baseline)}>Cancelar</AppButton><AppButton type="submit" disabled={!canEditRecord || !recordDirty || savingRecord}>{savingRecord ? 'Salvando…' : 'Salvar'}</AppButton></div>
            </div>
          </form>}
        </>}
      </AdminRecordCard> : <AdminDataGrid selectedKey={selectedId} onSelectRow={consoleMode ? (usuario) => setSelectedId(usuario.id) : undefined} onOpenRow={consoleMode ? openUser : undefined} columns={consoleMode ? [{ key: 'edit', label: 'Editar', className: 'admin-grid-icon-column', render: (usuario) => <button type="button" className="admin-grid-icon-action" aria-label={`Editar ${usuario.name}`} title={`Editar ${usuario.name}`} onClick={() => openUser(usuario)}><Pencil size={16} aria-hidden="true" /></button> }, ...columns.filter((column) => column.key !== 'actions')] : columns} rows={usuarios.items} rowKey={(usuario) => usuario.id} loading={loading} error={loadError ? 'Não foi possível carregar os usuários.' : undefined} onRetry={query.refetch} empty="Nenhum usuário corresponde aos filtros." toolbar={<AdminListToolbar actions={consoleMode ? <Link className="admin-console-primary-link" to={empresaId ? `/admin/empresas/${empresaId}/pessoas/convites/novo` : '/admin/pessoas/convites/novo'}><Plus size={16} />Novo</Link> : undefined}>
          <AppSearchInput label="Buscar usuários" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar nome, usuário, e-mail ou apelido" />
          <AppSelect aria-label="Filtrar usuários" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}>
            <option value="">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="management">Gerência</option>
          </AppSelect>
          <AppSelect aria-label="Ordenar usuários por nome" value={sort} onChange={(event) => { setSort(event.target.value as 'asc' | 'desc'); setPage(1); }}>
            <option value="asc">Nome A–Z</option><option value="desc">Nome Z–A</option>
          </AppSelect>
          {(search || status || sort !== 'asc') && <AppButton variant="ghost" size="sm" onClick={() => { setSearch(''); setStatus(''); setSort('asc'); setPage(1); }}>Limpar filtros</AppButton>}
        </AdminListToolbar>} footer={!loading && !loadError ? consoleMode
          ? <AdminGridPagination page={page} pageSize={recordsPerPage} total={usuarios.total} totalPages={usuarios.totalPages} ariaLabel="Paginação de usuários" onPageChange={setPage} onPageSizeChange={(size) => { setRecordsPerPage(size); setPage(1); }} />
          : <><span className="admin-grid-total">{usuarios.total} registros</span><AdminPagination page={page} totalPages={usuarios.totalPages} ariaLabel="Paginação de usuários" onPageChange={setPage} /></> : null} />}
    </div>
  );
}
