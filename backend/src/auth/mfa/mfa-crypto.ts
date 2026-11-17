import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const VERSION = 'v1';
const IV_BYTES = 12;

/** Chave AES-256 = SHA-256 do valor de MFA_ENCRYPTION_KEY. */
function key(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

/** AES-256-GCM; formato `v1:<iv b64>:<tag b64>:<cifrado b64>`. */
export function encryptMfaSecret(plain: string, secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  return [
    VERSION,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/** Falha (lança) se o formato, a chave ou a autenticação não baterem. */
export function decryptMfaSecret(payload: string, secret: string): string {
  const [version, iv, tag, encrypted, ...extra] = payload.split(':');
  if (version !== VERSION || !iv || !tag || !encrypted || extra.length)
    throw new Error('Segredo MFA em formato inválido');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(secret),
    Buffer.from(iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
