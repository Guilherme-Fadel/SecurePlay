import fastify from 'fastify';
import {
  API_SECURITY_HEADERS,
  HSTS_HEADER,
  registerSecurityHeaders,
} from './security-headers';

describe('Cabeçalhos de segurança da API (M4)', () => {
  async function headersFor(production: boolean, status = 200) {
    const app = fastify();
    registerSecurityHeaders(app, production);
    app.get('/', (_request, reply) => reply.code(status).send({ ok: true }));
    try {
      return (await app.inject({ method: 'GET', url: '/' })).headers;
    } finally {
      await app.close();
    }
  }

  it('respostas da API trazem os cabeçalhos', async () => {
    const headers = await headersFor(false);
    for (const [name, value] of Object.entries(API_SECURITY_HEADERS))
      expect(headers[name]).toBe(value);
    expect(headers['strict-transport-security']).toBeUndefined();
  });

  it('em produção inclui HSTS, também em respostas de erro', async () => {
    const headers = await headersFor(true, 403);
    expect(headers['strict-transport-security']).toBe(HSTS_HEADER);
    expect(headers['x-frame-options']).toBe('DENY');
  });
});
