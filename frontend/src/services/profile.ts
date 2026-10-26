import { api } from '@/services/api';
import { notifySessionRenewed } from './session-events';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  const response = await api.patch('/auth/password', payload);
  notifySessionRenewed();
  return response.data;
}

export interface NicknameRequestResult {
  nickname: string | null;
  nickname_pending: string | null;
  nickname_request_status: 'none' | 'pending' | 'approved' | 'rejected';
  nickname_onboarding_pending: boolean;
  message: string;
}

export async function requestNickname(nickname: string): Promise<NicknameRequestResult> {
  const response = await api.patch('/usuarios/perfil/apelido', { nickname });
  return response.data;
}

export async function dismissNicknameOnboarding(): Promise<{ nickname_onboarding_pending: boolean }> {
  const response = await api.patch('/usuarios/perfil/boas-vindas/apelido');
  return response.data;
}

export async function presignProfileImage(contentType: string): Promise<{
  uploadUrl: string;
  fields: Record<string, string>;
  key: string;
}> {
  const response = await api.post('/usuarios/perfil/foto/presign', { contentType });
  return response.data;
}

export async function saveProfileImage(key: string): Promise<{
  profile_image_url: string | null;
  message: string;
}> {
  const response = await api.patch('/usuarios/perfil/foto', { key });
  return response.data;
}
