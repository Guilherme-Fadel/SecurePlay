import { invalidatePrefix } from './queryCache';

export type AdminResource = 'companies' | 'companies-page' | 'summary' | 'users' | 'nicknames' | 'invitations' | 'theme' | 'parameters' | 'pilots' | 'audit-settings' | 'audit-events';

// useCachedQuery acrescenta a identidade da sessão; o alvo e os filtros compõem a consulta.
export function adminQueryKey(resource: AdminResource, empresaId?: number, filters?: object) {
  const scope = empresaId === undefined ? 'session' : `company:${empresaId}`;
  return `admin:${scope}:${resource}${filters ? `:${JSON.stringify(filters)}` : ''}`;
}

export function invalidateAdminResources(empresaId: number | undefined, ...resources: AdminResource[]) {
  invalidatePrefix('admin:platform:records');
  for (const resource of resources) invalidatePrefix(adminQueryKey(resource, empresaId));
}

export function invalidateAdminCompanies() {
  invalidateAdminResources(undefined, 'companies', 'companies-page');
}
