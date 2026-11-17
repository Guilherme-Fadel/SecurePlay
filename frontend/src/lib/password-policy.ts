export const MAX_PASSWORD_UTF8_BYTES = 72;
/** Mínimo para senha nova; o backend (IsSecurePassword) também recusa senhas comuns. */
export const MIN_PASSWORD_LENGTH = 8;

export function passwordValidationMessage(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (!/\S/.test(password)) return 'A senha não pode conter apenas espaços.';
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_UTF8_BYTES) {
    return 'A senha deve ter no máximo 72 bytes em UTF-8.';
  }
  return null;
}
