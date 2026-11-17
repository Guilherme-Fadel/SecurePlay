import { BadRequestException, Logger } from '@nestjs/common';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const TURNSTILE_FAILED_MESSAGE =
  'Não foi possível confirmar que você é uma pessoa. Recarregue a página e tente de novo.';

const logger = new Logger('Turnstile');

function rejected(): BadRequestException {
  return new BadRequestException({
    message: TURNSTILE_FAILED_MESSAGE,
    code: 'turnstile_failed',
  });
}

async function siteverify(
  secret: string,
  token: string,
  remoteIp: string,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);
  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json().catch(() => null)) as {
      success?: unknown;
    } | null;
    return response.ok && result?.success === true;
  } catch (error: unknown) {
    const name = error instanceof Error ? error.name : 'erro';
    logger.warn(`Verificação do Turnstile indisponível (${name}).`);
    return false;
  }
}

/**
 * Valida o token do Cloudflare Turnstile nos formulários públicos (cadastro trial, reenvio e
 * esqueci senha). Sem TURNSTILE_SECRET_KEY a checagem fica desligada (local e testes). Falha
 * de rede no siteverify recusa o pedido.
 */
export async function assertTurnstile(
  token: string | undefined,
  remoteIp: string,
  secret: string | undefined = process.env.TURNSTILE_SECRET_KEY,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const key = secret?.trim();
  if (!key) return;
  const value = token?.trim();
  if (!value || !(await siteverify(key, value, remoteIp, fetchImpl))) {
    throw rejected();
  }
}
