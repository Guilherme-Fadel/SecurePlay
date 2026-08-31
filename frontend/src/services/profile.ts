import { api } from '@/services/api';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  const response = await api.patch('/auth/password', payload);
  return response.data;
}
