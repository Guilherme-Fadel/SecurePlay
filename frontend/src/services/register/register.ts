import { api } from '@/services/api';

export interface RegisterResult {
  sucesso: boolean;
  mensagem: string;
}

export async function registerService(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
  acceptTerms: boolean
): Promise<RegisterResult> {

  if (!name || name.length < 3) {
    return { sucesso: false, mensagem: 'Nome deve ter pelo menos 3 caracteres' };
  }

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return { sucesso: false, mensagem: 'E-mail inválido' };
  }

  if (!password || password.length < 6) {
    return { sucesso: false, mensagem: 'Senha deve ter pelo menos 6 caracteres' };
  }

  if (password !== confirmPassword) {
    return { sucesso: false, mensagem: 'As senhas não coincidem' };
  }

  if (!acceptTerms) {
    return { sucesso: false, mensagem: 'Aceite os termos para continuar' };
  }

  const response = await api.post('/usuarios/criar', {
    name,
    email,
    password,
  });

  return response.data as RegisterResult;
}
