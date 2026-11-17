import { api } from '@/services/api';
import { getMe, type CurrentUser } from '@/services/me';
import { classifyLoginError, LOGIN_ERROR_MESSAGES } from './loginErrors';
import type { LoginOutcome } from './types';

const DEFAULT_MESSAGES = {
  success: 'Login realizado',
  email_verification: 'Confira seu e-mail para confirmar o acesso.',
  password_setup: 'Defina sua senha pelo link enviado ao seu e-mail antes de entrar.',
  mfa: 'Confirme seu acesso com o código do app autenticador.',
} as const;

function asRecord(data: unknown): Record<string, unknown> {
  return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Etapas que adiam a sessão: confirmar e-mail, definir senha ou verificar o app autenticador. */
function pendingStep(data: Record<string, unknown>, fallbackEmail: string): LoginOutcome | null {
  const message = readString(data, 'message');
  const email = readString(data, 'email') ?? fallbackEmail;
  if (data.requiresEmailVerification === true) {
    return { status: 'email_verification', email, message: message ?? DEFAULT_MESSAGES.email_verification };
  }
  if (data.requiresPasswordSetup === true) {
    return { status: 'password_setup', email, message: message ?? DEFAULT_MESSAGES.password_setup };
  }
  if (data.requiresMfa === true) {
    return { status: 'mfa', setupRequired: data.mfaSetupRequired === true, message: message ?? DEFAULT_MESSAGES.mfa };
  }
  return null;
}

export async function loginService(identifier: string, password: string): Promise<LoginOutcome> {
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier || !password) {
    return { status: 'error', reason: 'missing_fields', message: LOGIN_ERROR_MESSAGES.missing_fields };
  }

  let data: Record<string, unknown>;
  try {
    const response = await api.post<unknown>('/auth/login', { identifier: trimmedIdentifier, password });
    data = asRecord(response.data);
  } catch (error) {
    return { status: 'error', ...classifyLoginError(error) };
  }

  const pending = pendingStep(data, trimmedIdentifier);
  if (pending) return pending;

  let user: CurrentUser;
  try {
    user = await getMe();
  } catch {
    return { status: 'error', reason: 'session', message: LOGIN_ERROR_MESSAGES.session };
  }

  return {
    status: 'success',
    user,
    nome: readString(data, 'nome'),
    message: readString(data, 'message') ?? DEFAULT_MESSAGES.success,
  };
}
