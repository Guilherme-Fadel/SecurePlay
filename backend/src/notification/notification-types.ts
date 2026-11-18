export const NOTIFICATION_TYPES = [
  'conquista',
  'progresso',
  'ranking',
  'turma',
  'gestao',
  'seguranca',
  'aviso',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Rotas internas do frontend que uma notificação pode abrir: área do aluno
 * (`appPaths.ts`) e console administrativo (`/admin/...`).
 */
export const NOTIFICATION_LINK_PREFIXES: readonly string[] = [
  '/inicio',
  '/aprender',
  '/jogos',
  '/ranking',
  '/conquistas',
  '/perfil',
  '/admin',
];

export const NOTIFICATION_LINK_MAX_LENGTH = 200;

const CARACTERES_PERMITIDOS = /^\/[A-Za-z0-9\-._~/?=&%#:+]*$/;

/** Só caminhos internos de um prefixo permitido; qualquer outra coisa vira null. */
export function sanitizeNotificationLink(link?: string | null): string | null {
  if (typeof link !== 'string') return null;
  const valor = link.trim();
  if (!valor || valor.length > NOTIFICATION_LINK_MAX_LENGTH) return null;
  if (!CARACTERES_PERMITIDOS.test(valor)) return null;
  if (valor.includes('//') || valor.includes('..')) return null;

  const permitido = NOTIFICATION_LINK_PREFIXES.some(
    (prefixo) =>
      valor === prefixo ||
      (valor.startsWith(prefixo) &&
        '/?#'.includes(valor.charAt(prefixo.length))),
  );
  return permitido ? valor : null;
}
