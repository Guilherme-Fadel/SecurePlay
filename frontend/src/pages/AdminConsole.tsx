import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, LogOut, Moon, Sun, Users, Settings, Plus, ArrowLeft, Menu, X, GraduationCap } from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEmpresaTema } from '@/hooks/useEmpresaTema';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { logoutUser } from '@/services/login/logout';
import { AdminActionGuardProvider, useAdminGuardedAction } from '@/hooks/useAdminUnsavedChanges';
import { AdminPageHeader } from '@/components/admin/AdminListLayout';
import { CompanyManagementTab } from '@/components/admin/CompanyManagementTab';
import { getTema, type EmpresaAdministravel } from '@/services/admin';
import { AdminOverviewTab } from '@/components/admin/AdminOverviewTab';
import { AuditTab } from '@/components/admin/AuditTab';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { PendingNicknamesTab } from '@/components/admin/PendingNicknamesTab';
import { InvitationManagementTab } from '@/components/admin/InvitationManagementTab';
import { SchoolPilotManagementTab } from '@/components/admin/SchoolPilotManagementTab';
import { AdminConsoleSettings, type AdminConsoleSettingsKind } from '@/components/admin/console/AdminConsoleSettings';
import { hasAdminConsoleAccess, resolveAdminConsoleScope, adminConsolePath, resolveConsolePage } from '@/components/admin/console/consoleNavigation';
import { PlatformCompanyFilter } from '@/components/admin/console/PlatformCompanyFilter';
import { PlatformRecordsTab } from '@/components/admin/console/PlatformRecordsTab';
import { CompanyRegistryTab } from '@/components/admin/console/CompanyRegistryTab';
import { CompanyEditorTabs } from '@/components/admin/console/CompanyEditorTabs';
import { AdminConsoleSidebar } from '@/components/admin/console/AdminConsoleSidebar';
import { adminBreadcrumbs } from '@/components/admin/console/adminBreadcrumbs';
import { platformPageCompanyId, platformResources, platformSectionPath } from '@/components/admin/console/platformNavigation';
import './admin-users.css';
import '@/styles/app-ui.css';
import '@/components/admin/admin-shared.css';
import './admin-console.css';

export default function AdminConsole() {
  const { user, clearSession } = useCurrentUser();
  const location = useLocation();

  if (!hasAdminConsoleAccess(user)) return <Navigate to="/home" replace state={{ from: location }} />;
  const scope = user ? resolveAdminConsoleScope(user) : null;
  if (!scope) return <Navigate to="/home" replace />;
  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    return <Navigate to={adminConsolePath('overview')} replace />;
  }

  const signOut = async () => {
    try {
      await logoutUser();
    } finally {
      clearSession();
      window.location.assign('/login');
    }
  };

  return (
    <PageTransition>
      <ThemeProvider>
        <AdminActionGuardProvider><AdminConsoleFrame onSignOut={signOut} scope={scope} /></AdminActionGuardProvider>
      </ThemeProvider>
    </PageTransition>
  );
}

function AdminConsoleFrame({ onSignOut, scope }: { onSignOut: () => Promise<void>; scope: NonNullable<ReturnType<typeof resolveAdminConsoleScope>> }) {
  const { user } = useCurrentUser();
  const location = useLocation();
  useEmpresaTema();

  const isOverview = resolveConsolePage(location.pathname).id === 'overview';
  const sidebarKey = `admin-sidebar-collapsed:${user?.userId}`;
  const [sidebarPreference, setSidebarPreference] = useState<boolean | null>(() => {
    try { const saved = localStorage.getItem(sidebarKey); return saved === 'true' ? true : saved === 'false' ? false : null; } catch { return null; }
  });
  const collapsed = scope.kind === 'platform' && (sidebarPreference ?? !isOverview);
  const toggleSidebar = () => {
    const next = !collapsed; setSidebarPreference(next);
    try { localStorage.setItem(sidebarKey, String(next)); } catch { /* Optional preference. */ }
  };
  const menuRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { menuRef.current?.close(); }, [location.pathname]);
  const companyId = scope.kind === 'platform' ? getCompanyIdFromPath(location.pathname) : null;
  const page = resolveConsolePage(location.pathname);
  useEffect(() => {
    document.documentElement.dataset.adminConsole = 'true';
    return () => { delete document.documentElement.dataset.adminConsole; };
  }, []);

  return (
    <div className={`admin-console${collapsed ? ' is-sidebar-collapsed' : ''}`}>
      <div className="admin-console-desktop-navigation"><AdminConsoleSidebar scope={scope} collapsed={collapsed} onToggle={scope.kind === 'platform' ? toggleSidebar : undefined} /></div>
      <dialog ref={menuRef} className="admin-console-mobile-navigation" aria-label="Menu administrativo" onClick={(event) => { if (event.target === event.currentTarget) menuRef.current?.close(); }}>
        <button type="button" className="admin-console-icon-button admin-console-close-menu" autoFocus aria-label="Fechar menu" onClick={() => menuRef.current?.close()}><X size={18} /></button>
        <AdminConsoleSidebar scope={scope} />
      </dialog>

      <div className="admin-console-main">
        <header className="admin-console-topbar">
          <button type="button" className="admin-console-icon-button admin-console-open-menu" aria-label="Abrir menu administrativo" aria-haspopup="dialog" onClick={() => menuRef.current?.showModal()}><Menu size={18} /></button>
          <AdminConsoleBreadcrumb platform={scope.kind === 'platform'} />
          <AdminConsoleAccount name={user?.nickname || user?.name || 'Administrador'} onSignOut={onSignOut} />
        </header>

        <main className={`admin-console-content${page.list ? ' is-list-page' : ''}`}>
          <AdminConsolePage isOverview={isOverview} scope={scope} companyId={companyId} />
        </main>
      </div>
    </div>
  );
}

function ConsoleBackLink({ to, state }: { to: string; label: string; state?: { selectedId?: number } }) {
  return <Link className="admin-console-back-link" to={to} state={state} aria-label="Voltar"><ArrowLeft size={15} /><span>Voltar</span></Link>;
}

function AdminConsoleBreadcrumb({ platform }: { platform: boolean }) {
  const location = useLocation();
  const items = adminBreadcrumbs(location.pathname, platform, location.state?.returnTo);
  return <nav className="admin-console-breadcrumb" aria-label="Caminho da página"><ol>{items.map((item, index) => <li key={`${item.label}:${index}`}>{index > 0 && <ChevronRight size={14} aria-hidden="true" />}{item.to ? <Link to={item.to}>{item.label}</Link> : <span className="admin-console-breadcrumb-title" aria-current="page">{item.label}</span>}</li>)}</ol></nav>;
}

function getCompanyIdFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/admin\/empresas\/(\d+)(?:\/|$)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function AdminConsolePage({ isOverview, scope, companyId }: { isOverview: boolean; scope: NonNullable<ReturnType<typeof resolveAdminConsoleScope>>; companyId: number | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isPlatform = scope.kind === 'platform';
  if (isOverview) return scope.kind === 'company' ? <AdminOverviewTab empresaId={undefined} onNavigate={(tab) => navigate(`/admin/pessoas/${tab === 'usuarios' ? 'usuarios' : tab}`)} /> : <AdminOverviewTab platform onNavigate={(tab) => navigate(`/admin/pessoas/${tab}`)} headerActions={<Link className="admin-console-back-link" to="/admin/empresas"><Building2 size={16} />Instituições</Link>} />;
  if (resolveConsolePage(location.pathname).id === 'companies' && isPlatform) return <CompanyRegistryTab />;
  if (resolveConsolePage(location.pathname).id === 'new-company' && isPlatform) return <CompanyManagementTab headerActions={<ConsoleBackLink to="/admin/empresas" label="Cadastro" />} mode="new" consoleMode storageKey="admin-console:platform:companies-new" onEmpresaCriada={() => undefined} onAdministrar={(empresa) => navigate(`/admin/empresas/${empresa.id}/editar`)} />;
  if (scope.kind === 'company' && location.pathname.startsWith('/admin/empresas')) return <section className="admin-console-unavailable" role="alert"><h1>Acesso indisponível</h1><p>Esta rota pertence ao contexto da plataforma.</p><Link to="/admin/inicio">Voltar</Link></section>;
  if (isPlatform && platformSectionPath(resolveConsolePage(location.pathname).id)) return <PlatformWorkspace key={platformSectionPath(resolveConsolePage(location.pathname).id)} companyId={companyId} />;
  if (isPlatform && location.pathname.startsWith('/admin/empresas/') && companyId !== null) return <ResolvedCompany companyId={companyId} />;
  if (isPlatform && location.pathname.startsWith('/admin/empresas/')) return <section className="admin-console-unavailable" role="alert"><h1>Empresa indisponível</h1><Link to="/admin/empresas">Voltar</Link></section>;
  if (scope.kind === 'company' && ['data', 'appearance', 'features'].includes(resolveConsolePage(location.pathname).id)) return <CompanySettingsPage />;
  if (scope.kind === 'company') return <CompanyPeoplePage empresaId={undefined} />;
  return <section className="admin-console-unavailable" role="status"><h1>Esta área ainda não está disponível</h1><p>A navegação será habilitada quando a etapa correspondente for iniciada.</p><Link to={adminConsolePath('overview')}>Voltar</Link></section>;
}

function ResolvedCompany({ companyId }: { companyId: number }) {
  const { data: theme, loading, error, refetch } = useCachedQuery(adminQueryKey('theme', companyId), () => getTema(companyId), { keepPreviousDataOnInvalidate: true });
  const company = theme ? { ...theme, id: companyId } : null;
  if (loading) return <section className="admin-console-unavailable" role="status">Carregando empresa…</section>;
  if (!company) return <section className="admin-console-unavailable" role="alert"><h1>Empresa indisponível</h1><p>{error ? 'Não foi possível carregar as empresas.' : 'Esta empresa não está disponível no contexto atual.'}</p>{error && <button type="button" onClick={refetch}>Tentar novamente</button>}<Link to="/admin/empresas">Voltar</Link></section>;
  return <>{error && <p role="alert">Não foi possível atualizar os dados da empresa. <button type="button" onClick={refetch}>Tentar novamente</button></p>}<ConsoleCompanyPage key={companyId} empresa={company} /></>;
}

function PlatformWorkspace({ companyId }: { companyId: number | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const requestAction = useAdminGuardedAction();
  const page = resolveConsolePage(location.pathname);
  const sectionPath = platformSectionPath(page.id) ?? '/admin/inicio';
  const storageKey = `platform-company:${user?.userId}:${sectionPath}`;
  const params = new URLSearchParams(location.search);
  let empresaId: number | undefined;
  let invalid = false;
  let savedCompany: string | null = null;
  try { savedCompany = sessionStorage.getItem(storageKey); } catch { /* Optional preference. */ }
  try {
    empresaId = platformPageCompanyId(page.id, companyId, params.has('empresa') ? params.get('empresa') : savedCompany);
  } catch { invalid = true; }
  useEffect(() => { if (!invalid && !['edit-user', 'edit-pilot', 'edit-company'].includes(page.id)) { try { sessionStorage.setItem(storageKey, empresaId ? String(empresaId) : ''); } catch { /* Optional preference. */ } } }, [empresaId, invalid, storageKey, page.id]);
  const resource = platformResources[page.id];
  const editor = !resource;
  const company = useCachedQuery(adminQueryKey('theme', empresaId), () => getTema(empresaId), { enabled: Boolean(empresaId) && editor && !['data', 'edit-company', 'new-pilot', 'new-invitation'].includes(page.id) });
  const listUrl = `${sectionPath}?empresa=${empresaId ?? ''}`;
  const returnUrl = typeof location.state?.returnTo === 'string' && location.state.returnTo.startsWith('/admin/') ? location.state.returnTo : listUrl;
  const changeCompany = (id?: number) => requestAction(() => {
    const currentPath = location.pathname.replace(/^\/admin\/empresas\/\d+(?=\/)/, '/admin');
    const targetPath = page.id === 'edit-user' || page.id === 'edit-pilot' ? sectionPath : currentPath;
    navigate(`${targetPath}?empresa=${id ?? ''}`);
  });
  let content;
  if (invalid) content = <section className="admin-console-unavailable" role="alert"><h1>Empresa inválida</h1><p>Escolha uma empresa válida no filtro.</p></section>;
  else if (resource) content = <PlatformRecordsTab key={`${resource}:${empresaId ?? 'all'}`} resource={resource} empresaId={empresaId} companyFilter={<PlatformCompanyFilter empresaId={empresaId} onChange={changeCompany} compact />} />;
  else if (page.id === 'new-pilot') content = <SchoolPilotManagementTab empresaId={empresaId} selectCompany headerActions={<ConsoleBackLink to={returnUrl} label="Pilotos escolares" />} />;
  else if (page.id === 'new-invitation') content = <InvitationManagementTab empresaId={empresaId} selectCompany podeCriarAdministrador mode="new" consoleMode headerActions={<ConsoleBackLink to={listUrl} label="Convites" />} />;
  else if (!empresaId && page.id === 'edit-user') content = <CompanyPeoplePage />;
  else if (!empresaId && ['appearance', 'features', 'data'].includes(page.id)) content = <Navigate to="/admin/empresas" replace />;
  else if (!empresaId) content = <section className="admin-console-unavailable"><h1>{page.title}</h1><p>Selecione uma empresa no filtro acima para {page.id.startsWith('new-') ? 'criar o registro' : 'abrir as configurações'}.</p></section>;
  else if (['data', 'edit-company', 'appearance', 'features'].includes(page.id)) content = <CompanySettingsPage empresaId={empresaId} />;
  else if (company.loading) content = <p role="status">Carregando empresa…</p>;
  else if (company.error || !company.data) content = <section className="admin-console-unavailable" role="alert"><h1>Empresa indisponível</h1><button type="button" onClick={company.refetch}>Tentar novamente</button></section>;
  else if (page.id === 'edit-user') content = <CompanyPeoplePage empresaId={empresaId} />;
  else if (page.id === 'edit-pilot') content = <SchoolPilotManagementTab key={empresaId} empresaId={empresaId} empresaNome={company.data.nome} headerActions={<ConsoleBackLink to={returnUrl} label="Pilotos escolares" />} />;
  else content = <CompanySettingsPage empresaId={empresaId} />;
  const fixedRecord = page.id === 'edit-user' || (Boolean(empresaId) && ['data', 'edit-company', 'appearance', 'features', 'edit-pilot'].includes(page.id));
  return <div className="admin-platform-workspace">{!['new-pilot', 'new-invitation'].includes(page.id) && ((editor && !fixedRecord) || invalid) && <div className="admin-platform-filter-bar"><PlatformCompanyFilter empresaId={empresaId} onChange={changeCompany} allowAll={!editor} /><span>Alterações aplicadas somente à empresa selecionada</span></div>}{content}</div>;
}

function ConsoleCompanyPage({ empresa }: { empresa: EmpresaAdministravel }) {
  const navigate = useNavigate();
  const location = useLocation();
  const empresaId = empresa.id;
  const path = location.pathname.replace(/\/+$/, '');
  const page = resolveConsolePage(path);
  if (['data', 'appearance', 'features'].includes(page.id)) return <CompanySettingsPage empresaId={empresaId} />;
  if (page.id === 'audit-settings' || page.id === 'audit-events') return <AuditTab empresaId={empresaId} empresaNome={empresa.nome} view={page.id === 'audit-events' ? 'events' : 'settings'} />;
  if (['pilots', 'new-pilot', 'edit-pilot'].includes(page.id)) return <SchoolPilotManagementTab key={empresaId} empresaId={empresaId} empresaNome={empresa.nome} headerActions={page.id !== 'pilots' ? <ConsoleBackLink to={`/admin/empresas/${empresaId}/operacao/pilotos`} label="Pilotos escolares" /> : undefined} />;
  if (page.id === 'edit-user' || path.endsWith('/pessoas/usuarios') || path.endsWith('/pessoas')) return <CompanyPeoplePage empresaId={empresaId} />;
  if (path.endsWith('/pessoas/apelidos')) return <PendingNicknamesTab empresaId={empresaId} consoleMode />;
  if (path.endsWith('/pessoas/convites/novo')) return <InvitationManagementTab empresaId={empresaId} podeCriarAdministrador headerActions={<ConsoleBackLink to={`/admin/empresas/${empresaId}/pessoas/convites`} label="Convites" />} mode="new" consoleMode />;
  if (path.endsWith('/pessoas/convites')) return <InvitationManagementTab empresaId={empresaId} podeCriarAdministrador headerActions={<Link className="admin-console-primary-link" to={`/admin/empresas/${empresaId}/pessoas/convites/novo`}><Plus size={16} /> Novo</Link>} mode="list" consoleMode />;
  if (page.id === 'summary') return <AdminOverviewTab onNavigate={(tab) => navigate(`/admin/empresas/${empresa.id}/pessoas/${tab}`)} empresaId={empresa.id} empresaNome={empresa.nome} title={empresa.nome} headerActions={<><Link className="admin-console-back-link" aria-label="Pessoas da empresa" to={`/admin/empresas/${empresa.id}/pessoas/usuarios`}><Users size={16} /><span>Pessoas</span></Link><Link className="admin-console-back-link" aria-label="Configurações da empresa" to={`/admin/empresas/${empresa.id}/configuracoes/dados`}><Settings size={16} /><span>Configurações</span></Link><ConsoleBackLink to="/admin/empresas" label="Trocar empresa" /></>} />;
  return <section className="admin-console-unavailable" role="status"><h1>Área indisponível</h1><Link to={`/admin/empresas/${empresa.id}/resumo`}>Voltar</Link></section>;
}

function CompanySettingsPage({ empresaId }: { empresaId?: number }) {
  const { user } = useCurrentUser();
  const path = useLocation().pathname.replace(/\/+$/, '');
  const kind: AdminConsoleSettingsKind = path.endsWith('/aparencia') ? 'appearance' : path.endsWith('/funcionalidades') ? 'features' : 'data';
  if (user?.role === 'platform_admin' && empresaId) return <CompanyEditorTabs key={empresaId} empresaId={empresaId} fallbackTab={kind} />;
  return <AdminConsoleSettings key={`${empresaId ?? 'session'}:${kind}`} kind={kind} empresaId={empresaId} />;
}

function CompanyPeoplePage({ empresaId }: { empresaId?: number }) {
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, '');
  const userMatch = path.match(/\/pessoas\/usuarios\/([1-9]\d*)\/editar$/);
  if (userMatch && Number.isSafeInteger(Number(userMatch[1]))) return <UserManagementTab key={`user-${empresaId ?? 'company'}-${userMatch[1]}`} empresaId={empresaId} usuarioId={Number(userMatch[1])} consoleMode />;
  if (path.endsWith('/pessoas/apelidos')) return <PendingNicknamesTab empresaId={empresaId} consoleMode />;
  if (path.endsWith('/pessoas/convites/novo')) return <InvitationManagementTab headerActions={<ConsoleBackLink to={"/admin/pessoas/convites"} label="Convites" />} mode="new" consoleMode />;
  if (path.endsWith('/pessoas/convites')) return <InvitationManagementTab headerActions={<Link className="admin-console-primary-link" to={"/admin/pessoas/convites/novo"}><Plus size={16} /> Novo</Link>} mode="list" consoleMode />;
  if (path.endsWith('/pessoas/usuarios') || path.endsWith('/pessoas')) return <UserManagementTab empresaId={empresaId} consoleMode />;
  return <section className="admin-console-unavailable"><h1>Pessoas</h1><p>Escolha uma lista no menu.</p></section>;
}

function AdminConsoleAccount({ name, onSignOut }: { name: string; onSignOut: () => Promise<void> }) {
  const { theme, toggleTheme } = useTheme();
  const requestAction = useAdminGuardedAction();
  return (
    <div className="admin-console-account">
      <span className="admin-console-account-name">{name}</span>
      <Link className="admin-console-learning-link" to="/home" aria-label="Abrir ambiente de aprendizagem" title="Abrir ambiente de aprendizagem"><GraduationCap size={17} aria-hidden="true" /><span>Home do aluno</span></Link>
      <button type="button" className="admin-console-icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>
        {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
      </button>
      <button type="button" className="admin-console-signout" aria-label="Sair da conta" onClick={() => requestAction(() => { void onSignOut().catch(() => undefined); })}><LogOut size={16} aria-hidden="true" /><span>Sair</span></button>
    </div>
  );
}
