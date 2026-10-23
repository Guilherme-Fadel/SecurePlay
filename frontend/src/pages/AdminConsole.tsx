import { useEffect, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, LogOut, Moon, ShieldCheck, Sun, Users, Settings, Plus, ArrowLeft, Menu, X, GraduationCap, LayoutDashboard, UserRoundPen, MailPlus, FileText, Palette, SlidersHorizontal, History, ScrollText, School } from 'lucide-react';
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
import { listarEmpresas, type EmpresaAdministravel } from '@/services/admin';
import { AdminOverviewTab } from '@/components/admin/AdminOverviewTab';
import { AuditTab } from '@/components/admin/AuditTab';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { PendingNicknamesTab } from '@/components/admin/PendingNicknamesTab';
import { InvitationManagementTab } from '@/components/admin/InvitationManagementTab';
import { SchoolPilotManagementTab } from '@/components/admin/SchoolPilotManagementTab';
import { AdminConsoleSettings, type AdminConsoleSettingsKind } from '@/components/admin/console/AdminConsoleSettings';
import { hasAdminConsoleAccess, resolveAdminConsoleScope, adminConsolePath, resolveConsolePage } from '@/components/admin/console/consoleNavigation';
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
  const menuRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { menuRef.current?.close(); }, [location.pathname]);
  const companyId = scope.kind === 'platform' ? getCompanyIdFromPath(location.pathname) : null;
  const page = resolveConsolePage(location.pathname);
  useEffect(() => {
    document.documentElement.dataset.adminConsole = 'true';
    return () => { delete document.documentElement.dataset.adminConsole; };
  }, []);

  return (
    <div className="admin-console">
      <div className="admin-console-desktop-navigation"><AdminConsoleSidebar isOverview={isOverview} scope={scope} companyId={companyId} /></div>
      <dialog ref={menuRef} className="admin-console-mobile-navigation" aria-label="Menu administrativo" onClick={(event) => { if (event.target === event.currentTarget) menuRef.current?.close(); }}>
        <button type="button" className="admin-console-icon-button admin-console-close-menu" autoFocus aria-label="Fechar menu" onClick={() => menuRef.current?.close()}><X size={18} /></button>
        <AdminConsoleSidebar isOverview={isOverview} scope={scope} companyId={companyId} />
      </dialog>

      <div className="admin-console-main">
        <header className="admin-console-topbar">
          <button type="button" className="admin-console-icon-button admin-console-open-menu" aria-label="Abrir menu administrativo" aria-haspopup="dialog" onClick={() => menuRef.current?.showModal()}><Menu size={18} /></button>
          <AdminConsoleBreadcrumb title={page.title} />
          <AdminConsoleAccount name={user?.nickname || user?.name || 'Administrador'} onSignOut={onSignOut} />
        </header>

        <main className={`admin-console-content${page.list ? ' is-list-page' : ''}`}>
          <AdminConsolePage isOverview={isOverview} name={user?.nickname || user?.name || 'administrador'} scope={scope} companyId={companyId} />
        </main>
      </div>
    </div>
  );
}

function AdminConsoleSidebar({ isOverview, scope, companyId }: { isOverview: boolean; scope: NonNullable<ReturnType<typeof resolveAdminConsoleScope>>; companyId: number | null }) {
  const pathname = useLocation().pathname.replace(/\/+$/, '');
  const peopleBase = scope.kind === 'company' ? '/admin/pessoas' : companyId ? `/admin/empresas/${companyId}/pessoas` : null;
  const settingsBase = scope.kind === 'company' ? '/admin/configuracoes' : companyId ? `/admin/empresas/${companyId}/configuracoes` : null;
  const isPeopleUsers = Boolean(peopleBase && (pathname === peopleBase || pathname === `${peopleBase}/usuarios`));
  const isCompanies = pathname === '/admin/empresas' || pathname === '/admin/empresas/nova';
  const isSettingsAudit = pathname.endsWith('/auditoria/configuracoes');
  const isEventsAudit = pathname.endsWith('/auditoria/eventos');
  const isOperations = pathname.includes('/operacao/pilotos');
  return (
    <aside className="admin-console-sidebar" aria-label="Navegação administrativa">
      <Link className="admin-console-brand" to={adminConsolePath('overview')} aria-label="SecurePlay, visão geral">
        <span className="admin-console-brand-mark"><ShieldCheck size={19} aria-hidden="true" /></span>
        <span><strong>SecurePlay</strong><small>Administração</small></span>
      </Link>
      <nav className="admin-console-nav" aria-label="Menu principal">
        <span className="admin-console-nav-label">PAINEL</span>
        <Link className={`admin-console-nav-link${isOverview ? ' is-active' : ''}`} to={adminConsolePath('overview')} aria-current={isOverview ? 'page' : undefined}>
          <LayoutDashboard size={17} aria-hidden="true" /> Visão geral
        </Link>
        {scope.kind === 'platform' && <Link className={`admin-console-nav-link${isCompanies ? ' is-active' : ''}`} to="/admin/empresas" aria-current={isCompanies ? 'page' : undefined}><Building2 size={17} aria-hidden="true" /> Empresas</Link>}
        {peopleBase && <>
          <span className="admin-console-nav-label">PESSOAS</span>
          <Link className={`admin-console-nav-link${isPeopleUsers ? ' is-active' : ''}`} to={`${peopleBase}/usuarios`} aria-current={isPeopleUsers ? 'page' : undefined}><Users size={17} aria-hidden="true" /> Usuários</Link>
          <Link className={`admin-console-nav-link${pathname.endsWith('/pessoas/apelidos') ? ' is-active' : ''}`} to={`${peopleBase}/apelidos`} aria-current={pathname.endsWith('/pessoas/apelidos') ? 'page' : undefined}><UserRoundPen size={17} aria-hidden="true" /> Apelidos pendentes</Link>
          <Link className={`admin-console-nav-link${pathname.includes('/pessoas/convites') ? ' is-active' : ''}`} to={`${peopleBase}/convites`} aria-current={pathname.includes('/pessoas/convites') ? 'page' : undefined}><MailPlus size={17} aria-hidden="true" /> Convites</Link>
        </>}
        {settingsBase && <>
          <span className="admin-console-nav-label">EMPRESA</span>
          <Link className={`admin-console-nav-link${pathname === settingsBase || pathname.endsWith('/configuracoes/dados') ? ' is-active' : ''}`} to={`${settingsBase}/dados`} aria-current={pathname === settingsBase || pathname.endsWith('/configuracoes/dados') ? 'page' : undefined}><FileText size={17} aria-hidden="true" /> Dados da empresa</Link>
          <Link className={`admin-console-nav-link${pathname.endsWith('/configuracoes/aparencia') ? ' is-active' : ''}`} to={`${settingsBase}/aparencia`} aria-current={pathname.endsWith('/configuracoes/aparencia') ? 'page' : undefined}><Palette size={17} aria-hidden="true" /> Aparência</Link>
          {scope.kind === 'platform' && <Link className={`admin-console-nav-link${pathname.endsWith('/configuracoes/funcionalidades') ? ' is-active' : ''}`} to={`${settingsBase}/funcionalidades`} aria-current={pathname.endsWith('/configuracoes/funcionalidades') ? 'page' : undefined}><SlidersHorizontal size={17} aria-hidden="true" /> Funcionalidades</Link>}
        </>}
        {scope.kind === 'platform' && companyId && <>
          <span className="admin-console-nav-label">AUDITORIA</span>
          <Link className={`admin-console-nav-link${isSettingsAudit ? ' is-active' : ''}`} to={`/admin/empresas/${companyId}/auditoria/configuracoes`} aria-current={isSettingsAudit ? 'page' : undefined}><History size={17} aria-hidden="true" /> Configurações</Link>
          <Link className={`admin-console-nav-link${isEventsAudit ? ' is-active' : ''}`} to={`/admin/empresas/${companyId}/auditoria/eventos`} aria-current={isEventsAudit ? 'page' : undefined}><ScrollText size={17} aria-hidden="true" /> Eventos administrativos</Link>
          <span className="admin-console-nav-label">OPERAÇÃO</span>
          <Link className={`admin-console-nav-link${isOperations ? ' is-active' : ''}`} to={`/admin/empresas/${companyId}/operacao/pilotos`} aria-current={isOperations ? 'page' : undefined}><School size={17} aria-hidden="true" /> Pilotos escolares</Link>
        </>}
      </nav>
      <div className="admin-console-sidebar-foot">Console administrativo</div>
    </aside>
  );
}

function ConsoleBackLink({ to, label }: { to: string; label: string }) {
  return <Link className="admin-console-back-link" to={to} aria-label={`Voltar: ${label}`}><ArrowLeft size={15} /><span>{label}</span></Link>;
}

function AdminConsoleBreadcrumb({ title }: { title: string }) {
  return <div className="admin-console-breadcrumb" aria-label="Caminho da página"><span>Administração</span><ChevronRight size={14} aria-hidden="true" /><span className="admin-console-breadcrumb-title" aria-current="page">{title}</span></div>;
}

function getCompanyIdFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/admin\/empresas\/(\d+)(?:\/|$)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function AdminConsolePage({ isOverview, name, scope, companyId }: { isOverview: boolean; name: string; scope: NonNullable<ReturnType<typeof resolveAdminConsoleScope>>; companyId: number | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isPlatform = scope.kind === 'platform';
  if (isOverview) return scope.kind === 'company' ? <AdminOverviewTab empresaId={undefined} onNavigate={(tab) => navigate(`/admin/pessoas/${tab === 'usuarios' ? 'usuarios' : tab}`)} /> : <AdminConsoleWelcome name={name} scope={scope} />;
  if (resolveConsolePage(location.pathname).id === 'companies' && isPlatform) return <CompanyManagementTab headerActions={<Link className="admin-console-primary-link" to="/admin/empresas/nova"><Plus size={16} /> Nova empresa</Link>} mode="list" consoleMode storageKey="admin-console:platform:companies" onEmpresaCriada={(empresa) => navigate(`/admin/empresas/${empresa.id}/resumo`)} onAdministrar={(empresa) => navigate(`/admin/empresas/${empresa.id}/resumo`)} />;
  if (resolveConsolePage(location.pathname).id === 'new-company' && isPlatform) return <CompanyManagementTab headerActions={<ConsoleBackLink to="/admin/empresas" label="Empresas" />} mode="new" consoleMode storageKey="admin-console:platform:companies-new" onEmpresaCriada={() => undefined} onAdministrar={(empresa) => navigate(`/admin/empresas/${empresa.id}/resumo`)} />;
  if (scope.kind === 'company' && location.pathname.startsWith('/admin/empresas')) return <section className="admin-console-unavailable" role="alert"><h1>Acesso indisponível</h1><p>Esta rota pertence ao contexto da plataforma.</p><Link to="/admin/inicio">Voltar ao início</Link></section>;
  if (isPlatform && location.pathname.startsWith('/admin/empresas/') && companyId !== null) return <ResolvedCompany companyId={companyId} />;
  if (isPlatform && location.pathname.startsWith('/admin/empresas/')) return <section className="admin-console-unavailable" role="alert"><h1>Empresa indisponível</h1><Link to="/admin/empresas">Voltar às empresas</Link></section>;
  if (scope.kind === 'company' && ['data', 'appearance', 'features'].includes(resolveConsolePage(location.pathname).id)) return <CompanySettingsPage />;
  if (scope.kind === 'company') return <CompanyPeoplePage empresaId={undefined} />;
  return <section className="admin-console-unavailable" role="status"><h1>Esta área ainda não está disponível</h1><p>A navegação será habilitada quando a etapa correspondente for iniciada.</p><Link to={adminConsolePath('overview')}>Voltar à visão geral</Link></section>;
}

function ResolvedCompany({ companyId }: { companyId: number }) {
  const { data: companies, loading, error, refetch } = useCachedQuery(adminQueryKey('companies'), listarEmpresas, { keepPreviousDataOnInvalidate: true });
  const company = companies?.find((item) => item.id === companyId);
  if (loading) return <section className="admin-console-unavailable" role="status">Carregando empresa…</section>;
  if (!company) return <section className="admin-console-unavailable" role="alert"><h1>Empresa indisponível</h1><p>{error ? 'Não foi possível carregar as empresas.' : 'Esta empresa não está disponível no contexto atual.'}</p>{error && <button type="button" onClick={refetch}>Tentar novamente</button>}<Link to="/admin/empresas">Voltar às empresas</Link></section>;
  return <>{error && <p role="alert">Não foi possível atualizar os dados da empresa. <button type="button" onClick={refetch}>Tentar novamente</button></p>}<ConsoleCompanyPage key={companyId} empresa={company} /></>;
}

function ConsoleCompanyPage({ empresa }: { empresa: EmpresaAdministravel }) {
  const location = useLocation();
  const empresaId = empresa.id;
  const path = location.pathname.replace(/\/+$/, '');
  const page = resolveConsolePage(path);
  if (['data', 'appearance', 'features'].includes(page.id)) return <CompanySettingsPage empresaId={empresaId} />;
  if (page.id === 'audit-settings' || page.id === 'audit-events') return <AuditTab empresaId={empresaId} empresaNome={empresa.nome} view={page.id === 'audit-events' ? 'events' : 'settings'} />;
  if (['pilots', 'new-pilot', 'edit-pilot'].includes(page.id)) return <SchoolPilotManagementTab key={empresaId} empresaId={empresaId} empresaNome={empresa.nome} headerActions={page.id !== 'pilots' ? <ConsoleBackLink to={`/admin/empresas/${empresaId}/operacao/pilotos`} label="Pilotos escolares" /> : undefined} />;
  if (path.endsWith('/pessoas/usuarios') || path.endsWith('/pessoas')) return <CompanyPeoplePage empresaId={empresaId} />;
  if (path.endsWith('/pessoas/apelidos')) return <PendingNicknamesTab empresaId={empresaId} consoleMode />;
  if (path.endsWith('/pessoas/convites/novo')) return <InvitationManagementTab empresaId={empresaId} podeCriarAdministrador headerActions={<ConsoleBackLink to={`/admin/empresas/${empresaId}/pessoas/convites`} label="Convites" />} mode="new" consoleMode />;
  if (path.endsWith('/pessoas/convites')) return <InvitationManagementTab empresaId={empresaId} podeCriarAdministrador headerActions={<Link className="admin-console-primary-link" to={`/admin/empresas/${empresaId}/pessoas/convites/novo`}><Plus size={16} /> Novo convite</Link>} mode="list" consoleMode />;
  if (page.id === 'summary') return <AdminOverviewTab empresaId={empresa.id} empresaNome={empresa.nome} title={empresa.nome} headerActions={<><Link className="admin-console-back-link" aria-label="Pessoas da empresa" to={`/admin/empresas/${empresa.id}/pessoas/usuarios`}><Users size={16} /><span>Pessoas</span></Link><Link className="admin-console-back-link" aria-label="Configurações da empresa" to={`/admin/empresas/${empresa.id}/configuracoes/dados`}><Settings size={16} /><span>Configurações</span></Link><ConsoleBackLink to="/admin/empresas" label="Trocar empresa" /></>} />;
  return <section className="admin-console-unavailable" role="status"><h1>Área indisponível</h1><Link to={`/admin/empresas/${empresa.id}/resumo`}>Voltar ao resumo da empresa</Link></section>;
}

function CompanySettingsPage({ empresaId }: { empresaId?: number }) {
  const path = useLocation().pathname.replace(/\/+$/, '');
  const kind: AdminConsoleSettingsKind = path.endsWith('/aparencia') ? 'appearance' : path.endsWith('/funcionalidades') ? 'features' : 'data';
  return <AdminConsoleSettings key={`${empresaId ?? 'session'}:${kind}`} kind={kind} empresaId={empresaId} />;
}

function CompanyPeoplePage({ empresaId }: { empresaId?: number }) {
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, '');
  if (path.endsWith('/pessoas/apelidos')) return <PendingNicknamesTab empresaId={empresaId} consoleMode />;
  if (path.endsWith('/pessoas/convites/novo')) return <InvitationManagementTab headerActions={<ConsoleBackLink to={"/admin/pessoas/convites"} label="Convites" />} mode="new" consoleMode />;
  if (path.endsWith('/pessoas/convites')) return <InvitationManagementTab headerActions={<Link className="admin-console-primary-link" to={"/admin/pessoas/convites/novo"}><Plus size={16} /> Novo convite</Link>} mode="list" consoleMode />;
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

function AdminConsoleWelcome({ name, scope }: { name: string; scope: NonNullable<ReturnType<typeof resolveAdminConsoleScope>> }) {
  const isCompany = scope.kind === 'company';
  return (
    <section className="admin-console-welcome"><AdminPageHeader title="Visão geral" description="Administração da plataforma." action={<Link className="admin-console-primary-link" to="/admin/empresas">Selecionar empresa</Link>} />
      <span className="admin-console-eyebrow">ÁREA ADMINISTRATIVA</span>
      <h2>Bem-vindo, {name}</h2>
      <p>Gerencie empresas, acessos e configurações em um só lugar.</p>
      <div className="admin-console-scope-card">
        <Building2 size={20} aria-hidden="true" />
        <div><strong>{isCompany ? 'Escopo da empresa' : 'Escopo da plataforma'}</strong><span>{isCompany ? 'A empresa é determinada pela sessão autenticada.' : 'Selecione uma empresa para consultar pessoas, configurações, auditorias e pilotos.'}</span></div>
      </div>
    </section>
  );
}
