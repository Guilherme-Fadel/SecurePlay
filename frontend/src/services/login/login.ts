import { api } from '../api';

export interface LoginResult {
  sucesso: boolean;
  mensagem: string;
  token?: string;
  nome?: string;
}

export async function loginService(
  email: string,
  password: string
): Promise<LoginResult> {

  if (!email || !password) {
    return { sucesso: false, mensagem: 'Email e senha são obrigatórios' };
  }

  try {

    const response = await api.post('/auth/login', { email, password });
    return {
      sucesso: true,
      mensagem: response.data.message ?? 'Login realizado',
       token: response.data.token,
      nome: response.data.nome,
    };

  } catch (error: any) {

    return {
      sucesso: false,
      mensagem:
        error.response?.data?.message ?? 'Usuário ou senha inválidos',
    };
  }
}
