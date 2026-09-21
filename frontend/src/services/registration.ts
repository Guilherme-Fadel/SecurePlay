import { api } from './api';

export async function startTrial(data: { name: string; email: string; birth_date: string }) {
  await api.post('/registration/trial', data);
}

export async function confirmEmail(token: string, password: string) {
  await api.post('/registration/confirm-email', { token, password });
}

export async function resendEmail(email: string): Promise<string> {
  const response = await api.post('/registration/resend', { email });
  return response.data.mensagem as string;
}
