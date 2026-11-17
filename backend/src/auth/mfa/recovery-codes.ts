import { createHmac, randomInt } from 'node:crypto';

/** Base32 sem caracteres ambíguos (sem I, O, 0 e 1). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const RECOVERY_CODE_COUNT = 8;

function randomGroup(): string {
  let group = '';
  for (let i = 0; i < 4; i++) group += ALPHABET[randomInt(ALPHABET.length)];
  return group;
}

/** Códigos no formato XXXX-XXXX, mostrados ao usuário uma única vez. */
export function generateRecoveryCodes(): string[] {
  return Array.from(
    { length: RECOVERY_CODE_COUNT },
    () => `${randomGroup()}-${randomGroup()}`,
  );
}

/** Maiúsculas e sem hífen nem espaços. */
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[\s-]/g, '');
}

/**
 * HMAC-SHA256 hex do código normalizado: é o único que vai ao banco. A chave deriva de
 * MFA_ENCRYPTION_KEY com rótulo próprio (separada da chave de cifra), então só o banco
 * não basta para testar códigos por força bruta.
 */
export function hashRecoveryCode(code: string, secret: string): string {
  const key = createHmac('sha256', secret)
    .update('mfa-recovery-codes')
    .digest();
  return createHmac('sha256', key)
    .update(normalizeRecoveryCode(code))
    .digest('hex');
}
