import type { CurrentUser } from '@/services/me';

export type AdminConsoleRouteId = 'overview' | 'companies' | 'people' | 'settings' | 'operations' | 'classes';
export type AdminConsoleScope =
  | { kind: 'company'; empresaId: number }
  | { kind: 'platform'; empresaId: number | null }
  | { kind: 'teacher'; empresaId: number };

export const adminConsoleRoutes: Record<AdminConsoleRouteId, { path: string; label: string; stage: string }> = {
  overview: { path: '/admin/inicio', label: 'Visão geral', stage: 'E2' },
  companies: { path: '/admin/empresas', label: 'Cadastro', stage: 'E4' },
  people: { path: '/admin/pessoas', label: 'Pessoas', stage: 'E5' },
  settings: { path: '/admin/configuracoes', label: 'Configurações', stage: 'E6' },
  operations: { path: '/admin/operacao', label: 'Operação', stage: 'E7' },
  classes: { path: '/admin/turmas', label: 'Turmas', stage: 'T1' },
};

export function initialAuthenticatedPath(user: Pick<CurrentUser, 'role'> | null | undefined): string {
  if (user?.role === 'teacher') return '/admin/turmas';
  return user?.role === 'admin' || user?.role === 'platform_admin' ? '/admin/inicio' : '/home';
}

export function hasAdminConsoleAccess(user: CurrentUser | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'platform_admin' || user?.role === 'teacher';
}

export function resolveAdminConsoleScope(user: CurrentUser): AdminConsoleScope | null {
  if (user.role === 'platform_admin') return { kind: 'platform', empresaId: null };
  const empresaId = user.empresa_id;
  const escolaValida = typeof empresaId === 'number' && Number.isInteger(empresaId) && empresaId > 0;
  if (user.role === 'admin' && escolaValida) return { kind: 'company', empresaId };
  // Professor usa o console só para as próprias turmas; o backend decide o escopo.
  if (user.role === 'teacher' && escolaValida) return { kind: 'teacher', empresaId };
  return null;
}

export function adminConsolePath(routeId: AdminConsoleRouteId): string {
  return adminConsoleRoutes[routeId].path;
}

export type ConsolePageId = 'overview' | 'companies' | 'new-company' | 'edit-company' | 'summary' | 'users' | 'edit-user' | 'nicknames' | 'invitations' | 'new-invitation' | 'data' | 'appearance' | 'features' | 'audit-settings' | 'audit-events' | 'pilots' | 'new-pilot' | 'edit-pilot' | 'classes' | 'new-class' | 'class-detail' | 'unavailable';
const consolePages: Array<{ pattern: RegExp; id: ConsolePageId; title: string; list?: boolean }> = [
  { pattern: /^\/admin\/(?:inicio|visao-geral)\/?$/, id: 'overview', title: 'Visão geral' },
  { pattern: /^\/admin\/empresas\/?$/, id: 'companies', title: 'Cadastro', list: true },
  { pattern: /^\/admin\/empresas\/nova\/?$/, id: 'new-company', title: 'Nova empresa' },
  { pattern: /^\/admin\/empresas\/[1-9]\d*\/editar\/?$/, id: 'edit-company', title: 'Editar empresa' },
  { pattern: /^\/admin\/empresas\/\d+(?:\/resumo)?\/?$/, id: 'summary', title: 'Resumo da empresa' },
  { pattern: /^\/admin\/pessoas(?:\/usuarios)?\/?$/, id: 'users', title: 'Usuários', list: true },
  { pattern: /^\/admin\/pessoas\/usuarios\/[1-9]\d*\/editar\/?$/, id: 'edit-user', title: 'Gerenciar usuário' },
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
  { pattern: /^\/admin\/turmas\/?$/, id: 'classes', title: 'Turmas', list: true },
  { pattern: /^\/admin\/turmas\/nova\/?$/, id: 'new-class', title: 'Nova turma' },
  { pattern: /^\/admin\/turmas\/[1-9]\d*(?:\/(?:jornada|alunos|professores|dados))?\/?$/, id: 'class-detail', title: 'Turma' },
];

export type TurmaTab = 'jornada' | 'alunos' | 'professores' | 'dados';

/** Aba da turma pela rota (`/admin/turmas/7/alunos` ou no escopo de uma empresa); padrão: Jornada. */
export function turmaTabFromPath(pathname: string): TurmaTab {
  const match = pathname.match(/\/turmas\/[1-9]\d*\/(jornada|alunos|professores|dados)\/?$/);
  return (match?.[1] as TurmaTab | undefined) ?? 'jornada';
}

export function turmaIdFromPath(pathname: string): number | null {
  const match = pathname.match(/\/turmas\/([1-9]\d*)(?:\/|$)/);
  return match ? Number(match[1]) : null;
}

export function resolveConsolePage(pathname: string) {
  const direct = consolePages.find((page) => page.pattern.test(pathname));
  const scopedPath = pathname.replace(/^\/admin\/empresas\/\d+(?=\/)/, '/admin');
  const page = direct ?? consolePages.find((item) => item.pattern.test(scopedPath));
  return page ?? { id: 'unavailable' as const, title: 'Página indisponível', list: false };
}
