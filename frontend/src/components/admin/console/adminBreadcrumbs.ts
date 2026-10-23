import { resolveConsolePage } from './consoleNavigation';

export interface AdminBreadcrumb { label: string; to?: string; }
export function adminBreadcrumbs(pathname: string, platform: boolean, returnTo?: string): AdminBreadcrumb[] {
  const page = resolveConsolePage(pathname);
  const items: AdminBreadcrumb[] = [{ label: 'Administração', to: '/admin/inicio' }];
  const parents: Partial<Record<typeof page.id, { label: string; path: string }>> = {
    'new-company': { label: 'Cadastro', path: '/admin/empresas' },
    'edit-company': { label: 'Cadastro', path: '/admin/empresas' },
    'edit-user': { label: 'Usuários', path: '/admin/pessoas/usuarios' },
    'new-invitation': { label: 'Convites', path: '/admin/pessoas/convites' },
    'new-pilot': { label: 'Pilotos escolares', path: '/admin/operacao/pilotos' },
    'edit-pilot': { label: 'Pilotos escolares', path: '/admin/operacao/pilotos' },
  };
  const parent = parents[page.id];
  if (platform && ['data', 'summary', 'appearance', 'features'].includes(page.id)) items.push({ label: 'Cadastro', to: '/admin/empresas' });
  else if (parent) {
    const safeReturn = typeof returnTo === 'string' && (returnTo === parent.path || returnTo.startsWith(`${parent.path}?`)) ? returnTo : parent.path;
    items.push({ label: parent.label, to: safeReturn });
  }
  items.push({ label: platform && page.id === 'data' ? 'Editar empresa' : page.title });
  return items;
}
