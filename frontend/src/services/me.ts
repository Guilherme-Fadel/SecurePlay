import { api } from '@/services/api'

export interface EmpresaPaleta {
  primary: string;
  secondary: string;
  accent: string;
  text_primary: string;
  text_secondary: string;
}

export interface CurrentUser {
  userId: number;
  name: string;
  email: string;
  level: number;
  role: string;
  empresa_id: number | null;
  empresa_paleta: EmpresaPaleta | null;
  empresa_logo: string | null;
  empresa_nome: string | null;
  nickname: string | null;
  nickname_pending: string | null;
  nickname_request_status: 'none' | 'pending' | 'approved' | 'rejected';
  profile_image_url: string | null;
}

export async function getMe(): Promise<CurrentUser> {
  const response = await api.get('/auth/me');
  return response.data;
}
