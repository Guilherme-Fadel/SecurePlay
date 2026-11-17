import type { FastifyInstance } from 'fastify';

/** Cabeçalhos de segurança da API (M4). A API só devolve JSON: nada nela deve ser renderizado. */
export const API_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'referrer-policy': 'no-referrer',
  'cross-origin-resource-policy': 'same-site',
};

export const HSTS_HEADER = 'max-age=31536000; includeSubDomains';

/** Registra os cabeçalhos em todas as respostas; HSTS só em produção (HTTPS na borda). */
export function registerSecurityHeaders(
  instance: Pick<FastifyInstance, 'addHook'>,
  production = process.env.NODE_ENV === 'production',
): void {
  instance.addHook('onSend', (_request, reply, payload, done) => {
    for (const [name, value] of Object.entries(API_SECURITY_HEADERS))
      reply.header(name, value);
    if (production) reply.header('strict-transport-security', HSTS_HEADER);
    done(null, payload);
  });
}
