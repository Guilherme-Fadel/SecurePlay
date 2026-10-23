import { api } from './api';

export type PlatformResource = 'users' | 'nicknames' | 'invitations' | 'audit-settings' | 'audit-events' | 'pilots';
export interface PlatformRecord {
  id: number; empresaId: number | null; empresaNome: string | null;
  title: string | null; subtitle?: string | null; detail?: string | null;
  status?: string; level?: number; role?: string; nickname?: string | null; registrationMode?: string;
  createdAt?: string; expiresAt?: string; uses?: number; maxUses?: number;
}
export interface PlatformRecordsPage { items: PlatformRecord[]; total: number; page: number; pageSize: number; totalPages: number; }
export interface PlatformRecordFilters { page: number; pageSize: number; empresaId?: number; search?: string; status?: string; sort?: string; }
export async function listPlatformRecords(resource: PlatformResource, filters: PlatformRecordFilters): Promise<PlatformRecordsPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') params.set(key, String(value));
  return (await api.get(`/platform/admin/registros/${resource}?${params}`)).data;
}
