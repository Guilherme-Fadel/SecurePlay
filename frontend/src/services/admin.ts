import { api } from '@/services/api';
import { EmpresaPaleta } from './me';

export interface TemaEmpresa {
  nome: string;
  logo_url: string | null;
  paleta: EmpresaPaleta | null;
}

export async function getTema(): Promise<TemaEmpresa> {
  const response = await api.get('/admin/empresa/tema');
  return response.data;
}

export async function updateTema(data: { paleta?: EmpresaPaleta; logo_url?: string }): Promise<TemaEmpresa> {
  const response = await api.put('/admin/empresa/tema', data);
  return response.data;
}

export async function presignLogo(contentType: string): Promise<{ uploadUrl: string; key: string }> {
  const response = await api.post('/admin/empresa/logo/presign', { contentType });
  return response.data;
}
