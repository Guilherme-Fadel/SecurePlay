import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** TOTP (RFC 6238) com HMAC-SHA1, 6 dígitos e passo de 30 s, só com `node:crypto`. */
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
const TOTP_SECRET_BYTES = 20;
/** Passos aceitos além do atual, para tolerar diferença de relógio. */
const TOTP_WINDOW = 1;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(data: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Base32 inválido');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
      value &= (1 << bits) - 1;
    }
  }
  return Buffer.from(bytes);
}

/** Segredo novo (20 bytes aleatórios) em base32. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(TOTP_SECRET_BYTES));
}

export function totpStep(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS);
}

/** HOTP (RFC 4226) sobre o contador informado; `digits` 6 por padrão. */
export function hotp(
  key: Buffer,
  counter: number,
  digits: number = TOTP_DIGITS,
): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

/** Código de `digits` dígitos para o instante dado (RFC 6238). */
export function totpCode(
  key: Buffer,
  nowMs: number = Date.now(),
  digits: number = TOTP_DIGITS,
): string {
  return hotp(key, totpStep(nowMs), digits);
}

function sameCode(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Confere o código no passo atual ±1. Devolve o passo que bateu (para o
 * antirreplay) ou `null`. Não interrompe no primeiro acerto, para o tempo não
 * depender de qual passo bateu.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  nowMs: number = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  let key: Buffer;
  try {
    key = base32Decode(secretBase32);
  } catch {
    return null;
  }
  const current = totpStep(nowMs);
  let matched: number | null = null;
  for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
    const step = current + delta;
    if (step >= 0 && sameCode(hotp(key, step), code)) matched = step;
  }
  return matched;
}

/** URL `otpauth://` para o aplicativo autenticador. */
export function otpauthUrl(account: string, secretBase32: string): string {
  const label = `SecurePlay:${encodeURIComponent(account)}`;
  return (
    `otpauth://totp/${label}?secret=${secretBase32}` +
    `&issuer=SecurePlay&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`
  );
}
