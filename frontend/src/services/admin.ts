import { api } from "@/services/api";
import { EmpresaPaleta } from "./me";
import type { CompanyParameters } from "@/config/features";

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

export interface RegistroAuditoriaEmpresa {
  id: number;
  created_at: string;
  alterado_por: { id: number; name: string; email: string } | null;
  configuracoes_alteradas: number;
}

export interface AuditoriaPaginada {
  items: RegistroAuditoriaEmpresa[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function empresaPath(empresaId?: number) {
  return empresaId ? `/platform/admin/empresas/${empresaId}` : "/admin/empresa";
}

export async function listarEmpresas(): Promise<EmpresaAdministravel[]> {
  const response = await api.get("/platform/admin/empresas");
  return response.data;
}

export async function criarEmpresa(data: {
  nome: string;
  email_administrador: string;
}): Promise<EmpresaCriadaComAdministrador> {
  const response = await api.post("/platform/admin/empresas", data);
  return response.data;
}

export async function getTema(empresaId?: number): Promise<TemaEmpresa> {
  const response = await api.get(`${empresaPath(empresaId)}/tema`);
  return response.data;
}

export async function getCompanyParameters(
  empresaId?: number,
): Promise<CompanyParameters> {
  const response = await api.get(`${empresaPath(empresaId)}/parametros`);
  return response.data;
}

export async function listarAuditoriaEmpresa(
  empresaId: number,
  page: number,
): Promise<AuditoriaPaginada> {
  const params = new URLSearchParams({ page: String(page), pageSize: '25' });
  const response = await api.get(`/platform/admin/empresas/${empresaId}/auditoria?${params}`);
  return response.data;
}

export async function updateCompanyParameters(
  data: CompanyParameters,
  empresaId?: number,
): Promise<CompanyParameters> {
  const response = await api.put(`${empresaPath(empresaId)}/parametros`, data);
  return response.data;
}

export async function updateCompanySettings(
  empresaId: number,
  data: {
    nome: string;
    paleta: EmpresaPaleta;
    logo_url?: string;
    parametros: CompanyParameters;
  },
): Promise<{ tema: TemaEmpresa; parametros: CompanyParameters }> {
  const response = await api.put(
    `/platform/admin/empresas/${empresaId}/configuracoes`,
    data,
  );
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
): Promise<{ uploadUrl: string; fields: Record<string, string>; key: string }> {
  const response = await api.post(`${empresaPath(empresaId)}/logo/presign`, {
    contentType,
  });
  return response.data;
}
