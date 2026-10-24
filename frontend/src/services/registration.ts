import { api } from './api';

export async function startTrial(data: { name: string; email: string; birth_date: string; username?: string; phone?: string }) {
  await api.post('/registration/trial', data);
}

export async function confirmEmail(token: string, username?: string): Promise<string> {
  const response = await api.post('/registration/confirm-email', { token, username });
  return response.data.password_setup_token as string;
}

export async function setPassword(token: string, password: string) {
  await api.post('/registration/set-password', { token, password });
}

export async function resendEmail(email: string): Promise<string> {
  const response = await api.post('/registration/resend', { email });
  return response.data.mensagem as string;
}

export async function resetStudentPassword(token: string, password: string): Promise<{ sucesso: boolean; mensagem: string; username?: string | null; login_code: string | null }> {
  const response = await api.post('/registration/student-password-reset', { token, password });
  return response.data;
}
