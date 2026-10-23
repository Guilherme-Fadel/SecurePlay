import type { ConsolePageId } from './consoleNavigation';
import type { PlatformResource } from '@/services/platformRecords';

export const platformResources: Partial<Record<ConsolePageId, PlatformResource>> = { users: 'users', nicknames: 'nicknames', invitations: 'invitations', 'audit-settings': 'audit-settings', 'audit-events': 'audit-events', pilots: 'pilots' };
export function platformSectionPath(id: ConsolePageId) {
  const paths: Partial<Record<ConsolePageId, string>> = {
    'edit-company': 'empresas',
    users: 'pessoas/usuarios', 'edit-user': 'pessoas/usuarios', nicknames: 'pessoas/apelidos',
    invitations: 'pessoas/convites', 'new-invitation': 'pessoas/convites',
    data: 'configuracoes/dados', appearance: 'configuracoes/aparencia', features: 'configuracoes/funcionalidades',
    'audit-settings': 'auditoria/configuracoes', 'audit-events': 'auditoria/eventos',
    pilots: 'operacao/pilotos', 'new-pilot': 'operacao/pilotos', 'edit-pilot': 'operacao/pilotos',
  };
  return paths[id] ? `/admin/${paths[id]}` : null;
}
export function platformCompanyId(value: string | null) {
  if (value === null || value === '') return undefined;
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Empresa inválida');
  return Number(value);
}

export function platformPageCompanyId(page: ConsolePageId, companyId: number | null, value: string | null) {
  // A global user editor targets the platform account, never a saved list filter.
  if (page === 'edit-user' && companyId === null) return undefined;
  return companyId ?? platformCompanyId(value);
}
