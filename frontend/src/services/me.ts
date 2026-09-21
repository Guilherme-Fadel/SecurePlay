import { api } from '@/services/api'
import type { CompanyParameters } from '@/config/features';

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
  birth_date: string | null;
  email_verified_at: string | null;
  trial_ends_at: string | null;
  level: number;
  role: string;
  empresa_id: number | null;
  empresa_paleta: EmpresaPaleta | null;
  empresa_logo: string | null;
  empresa_nome: string | null;
  empresa_parametros: CompanyParameters;
  nickname: string | null;
  nickname_pending: string | null;
  nickname_request_status: 'none' | 'pending' | 'approved' | 'rejected';
  profile_image_url: string | null;
}

export async function getMe(): Promise<CurrentUser> {
  const response = await api.get('/auth/me');
  return response.data;
}
