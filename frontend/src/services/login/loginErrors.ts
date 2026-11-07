import axios from 'axios';
import type { LoginFailureReason } from './types';

export interface LoginFailure {
  reason: LoginFailureReason;
  message: string;
}

export const LOGIN_ERROR_MESSAGES = {
  missing_fields: 'Preencha o usuário ou e-mail e a senha para entrar.',
  invalid_credentials: 'Usuário ou senha inválidos',
  invalid_input: 'Confira o usuário ou e-mail e a senha e tente de novo.',
  rate_limited: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
  forbidden: 'Não foi possível validar este acesso. Atualize a página e tente de novo.',
  network: 'Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.',
  server: 'O servidor teve um problema agora. Tente de novo em instantes.',
  session:
    'Não foi possível confirmar sua sessão. Tente novamente. Se o problema continuar, entre em contato com o suporte.',
} as const satisfies Record<LoginFailureReason, string>;

function failure(reason: LoginFailureReason, message: string = LOGIN_ERROR_MESSAGES[reason]): LoginFailure {
  return { reason, message };
}

/** Lê `message` do corpo de erro do Nest apenas quando é um texto não vazio. */
function backendMessage(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('message' in data)) return undefined;
  const { message } = data;
  return typeof message === 'string' && message.trim() ? message : undefined;
}

/**
 * Traduz qualquer falha de `POST /auth/login` num motivo e num texto em português.
 * O `message` do backend só é exibido no 401; o 400 do ValidationPipe pode vir
 * como lista em inglês e nunca é mostrado cru.
 */
export function classifyLoginError(error: unknown): LoginFailure {
  if (!axios.isAxiosError(error)) return failure('server');

  const { response } = error;
  if (!response) return failure('network');

  const { status } = response;
  if (status === 401) {
    return failure('invalid_credentials', backendMessage(response.data) ?? LOGIN_ERROR_MESSAGES.invalid_credentials);
  }
  if (status === 400) return failure('invalid_input');
  if (status === 429) return failure('rate_limited');
  if (status === 403) return failure('forbidden');
  return failure('server');
}
