/** Rótulos e helpers puros do Perfil (sem estado, sem regra de autorização). */

export function roleLabel(role?: string) {
  if (role === 'platform_admin') return 'Administrador da plataforma';
  if (role === 'admin') return 'Administrador';
  if (role === 'teacher') return 'Professor';
  return 'Participante';
}

export function isManagementRole(role?: string) {
  return role === 'admin' || role === 'platform_admin' || role === 'teacher';
}

/** Gestão vê o nome do cadastro; aluno vê o apelido aprovado (mesma regra anterior). */
export function profileDisplayName(user: { name?: string | null; nickname?: string | null } | null, isManagementUser: boolean, loading: boolean) {
  return (isManagementUser ? user?.name : user?.nickname || user?.name) || (loading ? 'Carregando perfil...' : 'Participante SecurePlay');
}

export function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

/** Primeira mensagem do backend (string ou lista) ou o texto padrão. */
export function apiErrorMessage(error: unknown, fallback: string) {
  const response = error as { response?: { data?: { message?: string | string[] } } };
  const message = response.response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) || fallback;
}

export type PasswordFieldKey = 'current' | 'next' | 'confirmation';

export interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordFormError {
  message: string;
  /** Campos marcados com aria-invalid; vazio quando o erro vem do servidor. */
  fields: PasswordFieldKey[];
}

/** Mesmas validações e mensagens da versão anterior, na mesma ordem. */
export function validatePasswordChange(
  values: PasswordValues,
  policyMessage: (password: string) => string | null,
): PasswordFormError | null {
  const { currentPassword, newPassword, confirmPassword } = values;
  if (!currentPassword || !newPassword || !confirmPassword) {
    const fields: PasswordFieldKey[] = [];
    if (!currentPassword) fields.push('current');
    if (!newPassword) fields.push('next');
    if (!confirmPassword) fields.push('confirmation');
    return { message: 'Preencha todos os campos para continuar.', fields };
  }
  const newPasswordError = policyMessage(newPassword);
  if (newPasswordError) return { message: newPasswordError, fields: ['next'] };
  if (newPassword !== confirmPassword) return { message: 'A confirmação não corresponde à nova senha.', fields: ['confirmation'] };
  if (currentPassword === newPassword) return { message: 'Escolha uma nova senha diferente da atual.', fields: ['next'] };
  return null;
}
