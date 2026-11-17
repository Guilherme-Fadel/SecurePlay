import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Orçamento diário de e-mails dos fluxos públicos (cadastro trial, reenvio e esqueci senha).
 * O padrão fica abaixo da cota diária do plano gratuito do provedor; ajuste com
 * EMAIL_PUBLIC_DAILY_LIMIT conforme o plano contratado. E-mails enviados pela gestão
 * (convites, confirmação de administrador) não entram na conta.
 */
export const DEFAULT_PUBLIC_EMAIL_DAILY_LIMIT = 80;

export function publicEmailDailyLimit(
  raw: string | undefined = process.env.EMAIL_PUBLIC_DAILY_LIMIT,
): number {
  const value = Number(raw?.trim());
  return Number.isSafeInteger(value) && value > 0
    ? value
    : DEFAULT_PUBLIC_EMAIL_DAILY_LIMIT;
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
