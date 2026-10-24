import { isAxiosError } from 'axios';
import { api } from './api';

export const registrationFields = ['razao_social', 'cnpj', 'unidade', 'contato_nome', 'contato_email', 'contato_telefone', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'] as const;
export type RegistrationField = typeof registrationFields[number];
export type CompanyRegistrationDraft = Record<RegistrationField, string>;
export type CompanyRegistrationData = Record<RegistrationField, string | null>;
export interface CompanyRegistrationView { empresa_id: number; nome: string; cadastro: CompanyRegistrationData; completo: boolean; atualizado_em: string | null }
export function registrationDraft(data?: Partial<CompanyRegistrationData>): CompanyRegistrationDraft {
  return Object.fromEntries(registrationFields.map(field => [field, data?.[field] ?? ''])) as CompanyRegistrationDraft;
}
export function registrationPayload(data: CompanyRegistrationDraft): CompanyRegistrationData {
  return Object.fromEntries(registrationFields.map(field => [field, data[field].trim() || null])) as CompanyRegistrationData;
}
export function registrationChanges(data: CompanyRegistrationDraft, baseline: CompanyRegistrationDraft): Partial<CompanyRegistrationData> {
  return Object.fromEntries(registrationFields.filter(field => data[field] !== baseline[field]).map(field => [field, data[field].trim() || null]));
}
export async function getCompanyRegistration(empresaId?: number): Promise<CompanyRegistrationView> {
  return (await api.get(empresaId === undefined ? '/admin/empresa/cadastro' : `/platform/admin/empresas/${empresaId}/cadastro`)).data;
}
export async function findCompanyCnpj(cnpj: string): Promise<{ empresa_id: number; unidade: string }[]> {
  return (await api.post('/platform/admin/empresas/cadastro/cnpj', { cnpj })).data;
}
export function companyError(error: unknown, fallback: string) {
  if (!isAxiosError<{ message?: string | string[] }>(error)) return fallback;
  const message = error.response?.data?.message;
  return Array.isArray(message) ? message.join('. ') : message || fallback;
}
