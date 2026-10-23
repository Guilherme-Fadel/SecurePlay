import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Building2, ChevronLeft, ChevronRight, FileText, History, LayoutDashboard, MailPlus, Palette, School, ScrollText, ShieldCheck, UserRoundPen, Users, type LucideIcon } from 'lucide-react';
import { resolveConsolePage, type AdminConsoleScope } from './consoleNavigation';

interface Item { label: string; to: string; icon: LucideIcon; active: boolean; }
export function AdminConsoleSidebar({ scope, collapsed = false, onToggle }: { scope: AdminConsoleScope; collapsed?: boolean; onToggle?: () => void }) {
  const location = useLocation();
  const page = resolveConsolePage(location.pathname).id;
  const navId = useId();
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<{ label: string; to: string; top: number; left: number } | null>(null);
  const platform = scope.kind === 'platform';
  const groups: { label: string; items: Item[] }[] = [
    { label: 'PAINEL', items: [{ label: 'Visão geral', to: '/admin/inicio', icon: LayoutDashboard, active: page === 'overview' }] },
    { label: 'PESSOAS', items: [
      { label: 'Usuários', to: '/admin/pessoas/usuarios', icon: Users, active: page === 'users' || page === 'edit-user' },
      { label: 'Apelidos pendentes', to: '/admin/pessoas/apelidos', icon: UserRoundPen, active: page === 'nicknames' },
      { label: 'Convites', to: '/admin/pessoas/convites', icon: MailPlus, active: page === 'invitations' || page === 'new-invitation' },
    ] },
    { label: 'EMPRESA', items: [
      platform ? { label: 'Cadastro', to: '/admin/empresas', icon: Building2, active: ['companies', 'new-company', 'edit-company', 'data', 'summary', 'appearance', 'features'].includes(page) } : { label: 'Dados da empresa', to: '/admin/configuracoes/dados', icon: FileText, active: page === 'data' },
      ...(!platform ? [{ label: 'Aparência', to: '/admin/configuracoes/aparencia', icon: Palette, active: page === 'appearance' }] : []),
    ] },
    ...(platform ? [
      { label: 'AUDITORIA', items: [
        { label: 'Configurações', to: '/admin/auditoria/configuracoes', icon: History, active: page === 'audit-settings' },
        { label: 'Eventos administrativos', to: '/admin/auditoria/eventos', icon: ScrollText, active: page === 'audit-events' },
      ] },
      { label: 'OPERAÇÃO', items: [{ label: 'Pilotos escolares', to: '/admin/operacao/pilotos', icon: School, active: ['pilots', 'new-pilot', 'edit-pilot'].includes(page) }] },
    ] : []),
  ];
  const showTooltip = (element: HTMLElement, item: Item) => {
    if (!collapsed) return;
    const rect = element.getBoundingClientRect();
    setTooltip({ label: item.label, to: item.to, left: rect.right + 10, top: Math.min(window.innerHeight - 40, Math.max(8, rect.top + (rect.height - 32) / 2)) });
  };
  return <aside className={`admin-console-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Navegação administrativa">
    <div className="admin-console-sidebar-header">
      <Link className="admin-console-brand" to="/admin/inicio" aria-label="SecurePlay, visão geral"><span className="admin-console-brand-mark"><ShieldCheck size={19} aria-hidden="true" /></span><span className="admin-console-brand-copy"><strong>SecurePlay</strong><small>Administração</small></span></Link>
      {onToggle && <button type="button" className="admin-console-icon-button admin-console-collapse-menu" aria-controls={navId} aria-expanded={!collapsed} aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'} title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'} onClick={() => { setTooltip(null); onToggle(); }}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>}
    </div>
    <nav id={navId} className="admin-console-nav" aria-label="Menu principal" onScroll={() => setTooltip(null)}>
      {groups.map((group) => <div className="admin-console-nav-group" role="group" aria-label={group.label} key={group.label}>
        <span className="admin-console-nav-label" aria-hidden="true">{group.label}</span>
        {group.items.map((item) => <Link key={item.to} className={`admin-console-nav-link${item.active ? ' is-active' : ''}`} to={item.to} aria-label={item.label} aria-current={item.active ? 'page' : undefined} aria-describedby={collapsed && tooltip?.to === item.to ? tooltipId : undefined} onMouseEnter={(event) => showTooltip(event.currentTarget, item)} onMouseLeave={() => setTooltip(null)} onFocus={(event) => showTooltip(event.currentTarget, item)} onBlur={() => setTooltip(null)} onClick={() => setTooltip(null)}><item.icon size={17} aria-hidden="true" /><span className="admin-console-nav-text">{item.label}</span></Link>)}
      </div>)}
    </nav>
    <div className="admin-console-sidebar-foot">Console administrativo</div>
    {collapsed && tooltip && createPortal(<div id={tooltipId} role="tooltip" className="admin-console-nav-tooltip" style={{ left: tooltip.left, top: tooltip.top }}>{tooltip.label}</div>, document.querySelector('.admin-console') ?? document.body)}
  </aside>;
}
