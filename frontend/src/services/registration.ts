import { api } from './api';

export async function startTrial(data: { name: string; email: string; birth_date: string }) {
  await api.post('/registration/trial', data);
}

export async function confirmEmail(token: string): Promise<string> {
  const response = await api.post('/registration/confirm-email', { token });
  return response.data.password_setup_token as string;
}

export async function setPassword(token: string, password: string) {
  await api.post('/registration/set-password', { token, password });
}

export async function resendEmail(email: string): Promise<string> {
  const response = await api.post('/registration/resend', { email });
  return response.data.mensagem as string;
}
