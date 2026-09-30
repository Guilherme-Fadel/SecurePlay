import { useDeferredValue, useEffect, useState } from 'react';
import { AlertCircle, Ban, CheckCircle2, Search, UsersRound } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { cn } from '@/lib/utils';
import { inativarUsuario, listarUsuarios, type UsuarioEmpresa, type UsuariosPaginados } from '@/services/convites';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface UserManagementTabProps { empresaId?: number; empresaNome?: string; }
const emptyResult: UsuariosPaginados = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };

export function UserManagementTab({ empresaId, empresaNome }: UserManagementTabProps) {
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
      .catch(() => { if (!cancelled) { setLoadError(true); setFeedback('Não foi possível carregar os usuários.'); } })
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

  return <div className="admin-users-content">
    <div className="admin-users-heading"><div><span className="admin-page-eyebrow">Usuários {empresaNome ? `· ${empresaNome}` : 'da empresa'}</span><h1>Usuários</h1><p>Pesquise, filtre e gerencie os acessos da empresa.</p></div><div className="admin-users-stat"><UsersRound size={18} /><span><strong>{usuarios.total}</strong> usuários</span></div></div>
    {feedback && <div className={cn('admin-feedback', feedback.startsWith('Não foi') && 'is-error')} role={feedback.startsWith('Não foi') ? 'alert' : 'status'}><span>{feedback.startsWith('Não foi') ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}</span>{feedback}{loadError && <AppButton variant="ghost" size="sm" onClick={() => setReload((current) => current + 1)}>Tentar novamente</AppButton>}</div>}
    <section className="admin-users-card admin-users-list-card">
      <div className="admin-users-card-heading"><span className="admin-users-heading-icon is-secondary"><UsersRound size={19} /></span><div><h2>Usuários cadastrados</h2><p>Usuários que concluíram o cadastro.</p></div></div>
      <div className="admin-user-toolbar"><label><span className="sr-only">Buscar usuários</span><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar nome, e-mail ou apelido" /></label><select aria-label="Filtrar usuários" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}><option value="">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="management">Gerência</option></select><select aria-label="Ordenar usuários por nome" value={sort} onChange={(event) => { setSort(event.target.value as 'asc' | 'desc'); setPage(1); }}><option value="asc">Nome A–Z</option><option value="desc">Nome Z–A</option></select></div>
      <div className="admin-users-list">{loading && <p className="admin-users-empty" role="status">Carregando usuários...</p>}{usuarios.items.length === 0 && !loading && !loadError ? <p className="admin-users-empty">Nenhum usuário corresponde aos filtros.</p> : usuarios.items.length > 0 && <table className="admin-user-table"><thead><tr><th>Usuário</th><th>Nível</th><th>Status</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{usuarios.items.map((usuario) => { const isManagement = usuario.role === 'admin' || usuario.role === 'platform_admin'; const roleLabel = usuario.role === 'admin' ? 'Administrador' : usuario.role === 'platform_admin' ? 'Gestão da plataforma' : ''; return <tr key={usuario.id} className={usuario.active ? '' : 'is-inactive'}><td data-label="Usuário"><strong>{isManagement ? usuario.name : usuario.nickname ?? usuario.name}</strong><small>{isManagement ? `${usuario.email} · ${roleLabel}` : `${usuario.nickname ? `${usuario.name} · ` : ''}${usuario.email}`}</small></td><td data-label="Nível">{usuario.level}</td><td data-label="Status"><span className={`admin-user-status ${usuario.active ? 'is-active' : 'is-inactive'}`}>{usuario.active ? 'Ativo' : 'Inativo'}</span></td><td data-label="Ações">{usuario.active && usuario.id !== user?.userId && usuario.role !== 'platform_admin' && <AppButton variant="ghost" size="sm" icon={<Ban size={14} />} disabled={deactivatingUser === usuario.id} onClick={() => void inativar(usuario)}>{deactivatingUser === usuario.id ? 'Inativando...' : 'Inativar'}</AppButton>}</td></tr>; })}</tbody></table>}</div>
      {usuarios.totalPages > 1 && <nav className="admin-table-pagination" aria-label="Paginação de usuários"><AppButton variant="ghost" size="sm" disabled={page === 1 || loading} onClick={() => setPage((current) => current - 1)}>Anterior</AppButton><span>Página {page} de {Math.max(1, usuarios.totalPages)}</span><AppButton variant="ghost" size="sm" disabled={page >= usuarios.totalPages || loading} onClick={() => setPage((current) => current + 1)}>Próxima</AppButton></nav>}
    </section>
  </div>;
}
