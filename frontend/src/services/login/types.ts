import type { CurrentUser } from '@/services/me';

/** Por que o login não terminou; cada motivo tem um texto próprio na tela. */
export type LoginFailureReason =
  | 'missing_fields'
  | 'invalid_credentials'
  | 'invalid_input'
  | 'rate_limited'
  | 'forbidden'
  | 'network'
  | 'server'
  | 'session';

/** Resultado do envio do formulário de login (contrato entre serviço e tela). */
export type LoginOutcome =
  | { status: 'success'; user: CurrentUser; nome?: string; message: string }
  | { status: 'email_verification'; email: string; message: string }
  | { status: 'password_setup'; email: string; message: string }
  | { status: 'error'; reason: LoginFailureReason; message: string };
