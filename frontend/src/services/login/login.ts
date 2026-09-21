import { api } from '@/services/api';
import { getMe, type CurrentUser } from '@/services/me';

export interface LoginResult {
  sucesso: boolean;
  mensagem: string;
  nome?: string;
  user?: CurrentUser;
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
    let user: CurrentUser;
    try {
      user = await getMe();
    } catch {
      return {
        sucesso: false,
        mensagem: 'Não foi possível confirmar sua sessão. Tente novamente. Se o problema continuar, entre em contato com o suporte.',
      };
    }
    return {
      sucesso: true,
      mensagem: response.data.message ?? 'Login realizado',
      nome: response.data.nome,
      user,
    };

  } catch (error: any) {

    return {
      sucesso: false,
      mensagem:
        error.response?.data?.message ?? 'Usuário ou senha inválidos',
    };
  }
}
