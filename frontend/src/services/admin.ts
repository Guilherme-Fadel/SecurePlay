import { api } from '@/services/api';
import { EmpresaPaleta } from './me';

export interface TemaEmpresa {
  nome: string;
  logo_url: string | null;
  paleta: EmpresaPaleta | null;
}

export interface EmpresaAdministravel extends TemaEmpresa {
  id: number;
}

export interface EmpresaCriadaComAdministrador {
  empresa: EmpresaAdministravel;
  token: string;
}

function empresaPath(empresaId?: number) {
  return empresaId
    ? `/platform/admin/empresas/${empresaId}`
    : '/admin/empresa';
}

export async function listarEmpresas(): Promise<EmpresaAdministravel[]> {
  const response = await api.get('/platform/admin/empresas');
  return response.data;
}

export async function criarEmpresa(data: {
  nome: string;
  email_administrador: string;
}): Promise<EmpresaCriadaComAdministrador> {
  const response = await api.post('/platform/admin/empresas', data);
  return response.data;
}

export async function getTema(empresaId?: number): Promise<TemaEmpresa> {
  const response = await api.get(`${empresaPath(empresaId)}/tema`);
  return response.data;
}

export async function updateTema(
  data: { paleta?: EmpresaPaleta; logo_url?: string },
  empresaId?: number,
): Promise<TemaEmpresa> {
  const response = await api.put(`${empresaPath(empresaId)}/tema`, data);
  return response.data;
}

export async function presignLogo(
  contentType: string,
  empresaId?: number,
): Promise<{ uploadUrl: string; key: string }> {
  const response = await api.post(`${empresaPath(empresaId)}/logo/presign`, { contentType });
  return response.data;
}
