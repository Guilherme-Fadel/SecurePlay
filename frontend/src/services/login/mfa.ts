import axios from 'axios';
import { api } from '@/services/api';
import { LOGIN_ERROR_MESSAGES } from './loginErrors';

/** Por que a etapa de verificação em duas etapas não avançou. */
export type MfaFailureReason = 'code_invalid' | 'challenge_invalid' | 'rate_limited' | 'network' | 'server';

export interface MfaFailure {
  reason: MfaFailureReason;
  message: string;
  /** Só no cadastro: o servidor informou que a conta já tem o app autenticador ativo. */
  alreadyActive?: boolean;
}

export const MFA_ERROR_MESSAGES = {
  code_invalid: 'Código inválido. Confira e tente de novo.',
  challenge_invalid: LOGIN_ERROR_MESSAGES.mfa_expired,
  rate_limited: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  network: LOGIN_ERROR_MESSAGES.network,
  server: LOGIN_ERROR_MESSAGES.server,
} as const satisfies Record<MfaFailureReason, string>;

const ALREADY_ACTIVE_MESSAGE = 'A verificação em duas etapas já está ativa nesta conta. Use o código do seu app autenticador.';
const OTPAUTH_PREFIX = 'otpauth://';

export type MfaSetupResult =
  | { status: 'success'; secret: string; otpauthUrl: string }
  | ({ status: 'error' } & MfaFailure);

export type MfaVerifyInput = { code: string } | { recoveryCode: string };

export type MfaVerifyResult =
  | { status: 'success'; nome?: string; message: string; recoveryCodes: string[] }
  | ({ status: 'error' } & MfaFailure);

function failure(reason: MfaFailureReason): MfaFailure {
  return { reason, message: MFA_ERROR_MESSAGES[reason] };
}

function asRecord(data: unknown): Record<string, unknown> {
  return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/**
 * Traduz qualquer falha de `/auth/mfa/*` num motivo e num texto em português.
 * O texto do backend nunca é exibido: só o `code` decide a classe do 401.
 */
export function classifyMfaError(error: unknown): MfaFailure {
  if (!axios.isAxiosError(error)) return failure('server');

  const { response } = error;
  if (!response) return failure('network');

  const { status } = response;
  if (status === 401) {
    return failure(asRecord(response.data).code === 'mfa_code_invalid' ? 'code_invalid' : 'challenge_invalid');
  }
  if (status === 400) return failure('code_invalid');
  if (status === 429) return failure('rate_limited');
  return failure('server');
}

/** Agrupa a chave base32 em blocos de 4 caracteres para facilitar a digitação no app. */
export function groupSecret(secret: string): string[] {
  const clean = secret.replace(/\s+/g, '');
  const groups: string[] = [];
  for (let index = 0; index < clean.length; index += 4) groups.push(clean.slice(index, index + 4));
  return groups;
}

/** Pede ao servidor uma chave nova para a conta que está no desafio de MFA. */
export async function startMfaSetup(): Promise<MfaSetupResult> {
  try {
    const response = await api.post<unknown>('/auth/mfa/setup');
    const data = asRecord(response.data);
    const secret = readString(data, 'secret');
    const otpauthUrl = readString(data, 'otpauthUrl');
    // O link vem do servidor, mas só abre app autenticador: qualquer outro esquema é recusado.
    if (!secret || !otpauthUrl?.startsWith(OTPAUTH_PREFIX)) return { status: 'error', ...failure('server') };
    return { status: 'success', secret, otpauthUrl };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      return { status: 'error', reason: 'server', message: ALREADY_ACTIVE_MESSAGE, alreadyActive: true };
    }
    return { status: 'error', ...classifyMfaError(error) };
  }
}

/** Confirma o código do app (ou um código de recuperação) e abre a sessão. */
export async function verifyMfa(input: MfaVerifyInput): Promise<MfaVerifyResult> {
  try {
    const response = await api.post<unknown>('/auth/mfa/verify', input);
    const data = asRecord(response.data);
    const codes = Array.isArray(data.recoveryCodes) ? data.recoveryCodes : [];
    return {
      status: 'success',
      nome: readString(data, 'nome'),
      message: readString(data, 'message') ?? 'Login realizado',
      recoveryCodes: codes.filter((code): code is string => typeof code === 'string' && code.trim() !== ''),
    };
  } catch (error) {
    return { status: 'error', ...classifyMfaError(error) };
  }
}
