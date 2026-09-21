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
}

export interface ApelidosPendentesPaginados {
  items: UsuarioEmpresa[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function empresaPath(empresaId?: number) {
  return empresaId
    ? `/platform/admin/empresas/${empresaId}`
    : '/admin/empresa';
}

export async function listarUsuarios(empresaId?: number): Promise<UsuarioEmpresa[]> {
  const response = await api.get(`${empresaPath(empresaId)}/usuarios`);
  return response.data;
}

export async function listarApelidosPendentes(
  options: { page: number; pageSize?: number; search?: string },
  empresaId?: number,
): Promise<ApelidosPendentesPaginados> {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize ?? 25),
  });
  if (options.search?.trim()) params.set('search', options.search.trim());
  const response = await api.get(`${empresaPath(empresaId)}/apelidos-pendentes?${params}`);
  return response.data;
}

export async function listarConvites(empresaId?: number): Promise<Convite[]> {
  const response = await api.get(`${empresaPath(empresaId)}/convites`);
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
