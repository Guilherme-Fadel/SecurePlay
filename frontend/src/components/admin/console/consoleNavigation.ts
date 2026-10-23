import type { CurrentUser } from '@/services/me';

export type AdminConsoleRouteId = 'overview' | 'companies' | 'people' | 'settings' | 'operations';
export type AdminConsoleScope =
  | { kind: 'company'; empresaId: number }
  | { kind: 'platform'; empresaId: number | null };

export const adminConsoleRoutes: Record<AdminConsoleRouteId, { path: string; label: string; stage: string }> = {
  overview: { path: '/admin/inicio', label: 'Visão geral', stage: 'E2' },
  companies: { path: '/admin/empresas', label: 'Empresas', stage: 'E4' },
  people: { path: '/admin/pessoas', label: 'Pessoas', stage: 'E5' },
  settings: { path: '/admin/configuracoes', label: 'Configurações', stage: 'E6' },
  operations: { path: '/admin/operacao', label: 'Operação', stage: 'E7' },
};

export function initialAuthenticatedPath(user: Pick<CurrentUser, 'role'> | null | undefined): string {
  return user?.role === 'admin' || user?.role === 'platform_admin' ? '/admin/inicio' : '/home';
}

export function hasAdminConsoleAccess(user: CurrentUser | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'platform_admin';
}

export function resolveAdminConsoleScope(user: CurrentUser): AdminConsoleScope | null {
  if (user.role === 'platform_admin') return { kind: 'platform', empresaId: null };
  const empresaId = user.empresa_id;
  if (user.role === 'admin' && typeof empresaId === 'number' && Number.isInteger(empresaId) && empresaId > 0) {
    return { kind: 'company', empresaId };
  }
  return null;
}

export function adminConsolePath(routeId: AdminConsoleRouteId): string {
  return adminConsoleRoutes[routeId].path;
}

export type ConsolePageId = 'overview' | 'companies' | 'new-company' | 'summary' | 'users' | 'nicknames' | 'invitations' | 'new-invitation' | 'data' | 'appearance' | 'features' | 'audit-settings' | 'audit-events' | 'pilots' | 'new-pilot' | 'edit-pilot' | 'unavailable';
const consolePages: Array<{ pattern: RegExp; id: ConsolePageId; title: string; list?: boolean }> = [
  { pattern: /^\/admin\/(?:inicio|visao-geral)\/?$/, id: 'overview', title: 'Visão geral' },
  { pattern: /^\/admin\/empresas\/?$/, id: 'companies', title: 'Empresas', list: true },
  { pattern: /^\/admin\/empresas\/nova\/?$/, id: 'new-company', title: 'Nova empresa' },
  { pattern: /^\/admin\/empresas\/\d+(?:\/resumo)?\/?$/, id: 'summary', title: 'Resumo da empresa' },
  { pattern: /^\/admin\/pessoas(?:\/usuarios)?\/?$/, id: 'users', title: 'Usuários', list: true },
  { pattern: /^\/admin\/pessoas\/apelidos\/?$/, id: 'nicknames', title: 'Apelidos pendentes', list: true },
  { pattern: /^\/admin\/pessoas\/convites\/?$/, id: 'invitations', title: 'Convites', list: true },
  { pattern: /^\/admin\/pessoas\/convites\/novo\/?$/, id: 'new-invitation', title: 'Novo convite' },
  { pattern: /^\/admin\/configuracoes(?:\/dados)?\/?$/, id: 'data', title: 'Dados da empresa' },
  { pattern: /^\/admin\/configuracoes\/aparencia\/?$/, id: 'appearance', title: 'Aparência' },
  { pattern: /^\/admin\/configuracoes\/funcionalidades\/?$/, id: 'features', title: 'Funcionalidades' },
  { pattern: /^\/admin\/auditoria\/configuracoes\/?$/, id: 'audit-settings', title: 'Auditoria · Configurações', list: true },
  { pattern: /^\/admin\/auditoria\/eventos\/?$/, id: 'audit-events', title: 'Eventos administrativos', list: true },
  { pattern: /^\/admin\/operacao\/pilotos\/?$/, id: 'pilots', title: 'Pilotos escolares', list: true },
  { pattern: /^\/admin\/operacao\/pilotos\/novo\/?$/, id: 'new-pilot', title: 'Novo piloto' },
  { pattern: /^\/admin\/operacao\/pilotos\/\d+\/editar\/?$/, id: 'edit-pilot', title: 'Editar piloto' },
];

export function resolveConsolePage(pathname: string) {
  const direct = consolePages.find((page) => page.pattern.test(pathname));
  const scopedPath = pathname.replace(/^\/admin\/empresas\/\d+(?=\/)/, '/admin');
  const page = direct ?? consolePages.find((item) => item.pattern.test(scopedPath));
  return page ?? { id: 'unavailable' as const, title: 'Página indisponível', list: false };
}
