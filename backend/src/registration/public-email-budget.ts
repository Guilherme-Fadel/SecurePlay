import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Orçamentos diários de e-mails dos fluxos públicos, separados para que o cadastro trial não
 * esgote a recuperação de senha das escolas: `cadastro` (cadastro trial) e `recuperacao`
 * (reenvio e esqueci senha). Os padrões ficam abaixo da cota diária do plano gratuito do
 * provedor; ajuste com EMAIL_PUBLIC_DAILY_LIMIT (cadastro) e EMAIL_RECOVERY_DAILY_LIMIT
 * (recuperação). E-mails enviados pela gestão (convites, confirmação de administrador) não
 * entram na conta.
 */
export const DEFAULT_PUBLIC_EMAIL_DAILY_LIMIT = 80;
export const DEFAULT_RECOVERY_EMAIL_DAILY_LIMIT = 80;

export type PublicEmailBudget = 'cadastro' | 'recuperacao';

function positiveIntegerOr(raw: string | undefined, fallback: number): number {
  const value = Number(raw?.trim());
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export function publicEmailDailyLimit(
  raw: string | undefined = process.env.EMAIL_PUBLIC_DAILY_LIMIT,
): number {
  return positiveIntegerOr(raw, DEFAULT_PUBLIC_EMAIL_DAILY_LIMIT);
}

export function recoveryEmailDailyLimit(
  raw: string | undefined = process.env.EMAIL_RECOVERY_DAILY_LIMIT,
): number {
  return positiveIntegerOr(raw, DEFAULT_RECOVERY_EMAIL_DAILY_LIMIT);
}

export function emailBudgetLimit(budget: PublicEmailBudget): number {
  return budget === 'cadastro'
    ? publicEmailDailyLimit()
    : recoveryEmailDailyLimit();
}

/** Consome uma unidade do orçamento; `false` quando o dia já esgotou. */
export type PublicEmailGate = () => Promise<boolean>;

const storage = new AsyncLocalStorage<PublicEmailGate>();

/** Executa um fluxo público: cada envio feito dentro dele consome o orçamento. */
export function runWithPublicEmailGate<T>(
  gate: PublicEmailGate,
  action: () => Promise<T>,
): Promise<T> {
  return storage.run(gate, action);
}

export function currentPublicEmailGate(): PublicEmailGate | undefined {
  return storage.getStore();
}
