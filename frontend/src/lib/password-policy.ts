export const MAX_PASSWORD_UTF8_BYTES = 72;

export function passwordValidationMessage(password: string): string | null {
  if (password.length < 6) return 'A senha deve ter ao menos 6 caracteres.';
  if (!/\S/.test(password)) return 'A senha não pode conter apenas espaços.';
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_UTF8_BYTES) {
    return 'A senha deve ter no máximo 72 bytes em UTF-8.';
  }
  return null;
}
