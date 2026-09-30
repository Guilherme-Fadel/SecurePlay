import { api } from './api';

export interface Convite {
  id: number;
  email: string | null;
  expires_at: string;
  max_uses: number;
  uses: number;
  role: 'user' | 'admin';
  status: 'ativo' | 'utilizado' | 'expirado' | 'revogado';
  created_at: string;
}

export interface UsuarioEmpresa {
  id: number;
  name: string;
  email: string;
  role: string;
  level: number;
  active: boolean;
  nickname: string | null;
  nickname_pending: string | null;
  nickname_request_status: 'none' | 'pending' | 'approved' | 'rejected';
}

export interface ConvitePublico {
  empresa_nome: string;
  email: string | null;
  expires_at: string;
  role: 'user' | 'admin';
}

export interface ApelidosPendentesPaginados {
  items: UsuarioEmpresa[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type UsuariosPaginados = ApelidosPendentesPaginados;

export interface ResumoAdministrativo {
  usuariosAtivos: number;
  usuariosInativos: number;
  apelidosPendentes: number;
  convitesAtivos: number;
}

function empresaPath(empresaId?: number) {
  return empresaId
    ? `/platform/admin/empresas/${empresaId}`
    : '/admin/empresa';
}

export async function listarUsuarios(
  options: { page: number; pageSize?: number; search?: string; status?: 'active' | 'inactive' | 'management'; sort?: 'asc' | 'desc' },
  empresaId?: number,
): Promise<UsuariosPaginados> {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize ?? 25),
  });
  if (options.search?.trim()) params.set('search', options.search.trim());
  if (options.status) params.set('status', options.status);
  if (options.sort) params.set('sort', options.sort);
  const response = await api.get(`${empresaPath(empresaId)}/usuarios?${params}`);
  return response.data;
}

export async function obterResumoAdministrativo(empresaId?: number): Promise<ResumoAdministrativo> {
  const response = await api.get(`${empresaPath(empresaId)}/resumo`);
  return response.data;
}

export async function listarApelidosPendentes(
  options: { page: number; pageSize?: number; search?: string; sort?: 'default' | 'asc' | 'desc' },
  empresaId?: number,
): Promise<ApelidosPendentesPaginados> {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize ?? 25),
  });
  if (options.search?.trim()) params.set('search', options.search.trim());
  if (options.sort) params.set('sort', options.sort);
  const response = await api.get(`${empresaPath(empresaId)}/apelidos-pendentes?${params}`);
  return response.data;
}

export interface ConvitesPaginados {
  items: Convite[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function listarConvites(
  options: { page: number; pageSize?: number; search?: string; sort?: 'asc' | 'desc' },
  empresaId?: number,
): Promise<ConvitesPaginados> {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize ?? 25),
    sort: options.sort ?? 'desc',
  });
  if (options.search?.trim()) params.set('search', options.search.trim());
  const response = await api.get(`${empresaPath(empresaId)}/convites/paginados?${params}`);
  return response.data;
}

export async function criarConvite(
  data: { email?: string; validade_dias: number; max_uses: number; administrador?: boolean },
  empresaId?: number,
) {
  const response = await api.post(`${empresaPath(empresaId)}/convites`, data);
  return response.data as { convite: Convite; token: string };
}

export async function revogarConvite(id: number, empresaId?: number): Promise<Convite> {
  const response = await api.post(`${empresaPath(empresaId)}/convites/${id}/revogar`);
  return response.data;
}

export async function consultarConvite(token: string): Promise<ConvitePublico> {
  const response = await api.post('/convites/consultar', { token });
  return response.data;
}

export async function concluirCadastroConvite(token: string, data: { name: string; nickname?: string; email: string; birth_date: string }) {
  const response = await api.post('/convites/cadastro', { ...data, token });
  return response.data as { sucesso: boolean; mensagem: string };
}

export async function aprovarApelido(usuarioId: number, empresaId?: number): Promise<UsuarioEmpresa> {
  const response = await api.post(`${empresaPath(empresaId)}/usuarios/${usuarioId}/apelido/aprovar`);
  return response.data;
}

export async function rejeitarApelido(usuarioId: number, empresaId?: number): Promise<UsuarioEmpresa> {
  const response = await api.post(`${empresaPath(empresaId)}/usuarios/${usuarioId}/apelido/rejeitar`);
  return response.data;
}

export async function inativarUsuario(usuarioId: number, empresaId?: number): Promise<UsuarioEmpresa> {
  const response = await api.post(`${empresaPath(empresaId)}/usuarios/${usuarioId}/inativar`);
  return response.data;
}
