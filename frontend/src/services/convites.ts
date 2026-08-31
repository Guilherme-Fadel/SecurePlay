import { api } from './api';

export interface Convite {
  id: number;
  email: string | null;
  expires_at: string;
  max_uses: number;
  uses: number;
  status: 'ativo' | 'utilizado' | 'expirado' | 'revogado';
  created_at: string;
}

export interface UsuarioEmpresa {
  id: number;
  name: string;
  email: string;
  role: string;
  level: number;
}

export interface ConvitePublico {
  empresa_nome: string;
  email: string | null;
  expires_at: string;
}

export async function listarUsuarios(): Promise<UsuarioEmpresa[]> {
  const response = await api.get('/admin/empresa/usuarios');
  return response.data;
}

export async function listarConvites(): Promise<Convite[]> {
  const response = await api.get('/admin/empresa/convites');
  return response.data;
}

export async function criarConvite(data: { email?: string; validade_dias: number; max_uses: number }) {
  const response = await api.post('/admin/empresa/convites', data);
  return response.data as { convite: Convite; token: string };
}

export async function revogarConvite(id: number): Promise<Convite> {
  const response = await api.post(`/admin/empresa/convites/${id}/revogar`);
  return response.data;
}

export async function consultarConvite(token: string): Promise<ConvitePublico> {
  const response = await api.get(`/convites/${token}`);
  return response.data;
}

export async function concluirCadastroConvite(token: string, data: { name: string; email: string; password: string }) {
  const response = await api.post(`/convites/${token}/cadastro`, data);
  return response.data as { sucesso: boolean; mensagem: string };
}
