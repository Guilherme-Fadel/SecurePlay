import fastify from 'fastify';
import {
  AppThrottlerGuard,
  PROXY_CLIENT_IP_HEADER,
  PROXY_SECRET_HEADER,
  proxiedClientIp,
} from './app-throttler.guard';

class TestGuard extends AppThrottlerGuard {
  tracker(request: Record<string, unknown>) {
    return this.getTracker(request);
  }
}

describe('AppThrottlerGuard — identidade calculada pelo Fastify', () => {
  const guard = Object.create(TestGuard.prototype) as TestGuard;
  it('separa clientes sob o mesmo proxy confiável e mantém a identidade do mesmo cliente', async () => {
    const app = fastify({ trustProxy: 1 });
    app.get('/', async (request) => ({
      tracker: await guard.tracker(
        request as unknown as Record<string, unknown>,
      ),
    }));
    try {
      const call = async (ip: string) =>
        (
          await app.inject({
            method: 'GET',
            url: '/',
            remoteAddress: '10.0.0.1',
            headers: { 'x-forwarded-for': ip },
          })
        ).json<{ tracker: string }>();
      expect((await call('203.0.113.9')).tracker).toBe('203.0.113.9');
      expect((await call('203.0.113.10')).tracker).toBe('203.0.113.10');
      expect((await call('203.0.113.9')).tracker).toBe('203.0.113.9');
    } finally {
      await app.close();
    }
  });

  describe('IP repassado pelo proxy da Pages', () => {
    const secret = 'segredo-de-teste-123';
    const headers = (ip: string, s = secret) => ({
      [PROXY_SECRET_HEADER]: s,
      [PROXY_CLIENT_IP_HEADER]: ip,
    });

    it('usa o IP do aluno quando o segredo confere', () => {
      expect(proxiedClientIp(headers('203.0.113.9'), secret)).toBe('203.0.113.9');
      expect(proxiedClientIp(headers('2001:db8::1'), secret)).toBe('2001:db8::1');
    });

    it('ignora o cabeçalho com segredo errado, ausente ou sem segredo configurado', () => {
      expect(proxiedClientIp(headers('203.0.113.9', 'outro'), secret)).toBeNull();
      expect(proxiedClientIp({ [PROXY_CLIENT_IP_HEADER]: '203.0.113.9' }, secret)).toBeNull();
      expect(proxiedClientIp(headers('203.0.113.9'), undefined)).toBeNull();
      expect(proxiedClientIp(headers('203.0.113.9'), '')).toBeNull();
    });

    it('ignora IP inválido', () => {
      expect(proxiedClientIp(headers('não-é-ip'), secret)).toBeNull();
      expect(proxiedClientIp(headers(''), secret)).toBeNull();
    });

    it('separa alunos atrás do mesmo IP da Cloudflare', async () => {
      const previous = process.env.PROXY_SHARED_SECRET;
      process.env.PROXY_SHARED_SECRET = secret;
      const app = fastify({ trustProxy: 1 });
      app.get('/', async (request) => ({
        tracker: await guard.tracker(request as unknown as Record<string, unknown>),
      }));
      try {
        const call = async (extra: Record<string, string>) =>
          (
            await app.inject({
              method: 'GET',
              url: '/',
              remoteAddress: '10.0.0.1',
              headers: { 'x-forwarded-for': '104.28.0.7', ...extra },
            })
          ).json<{ tracker: string }>().tracker;
        expect(await call(headers('203.0.113.9'))).toBe('203.0.113.9');
        expect(await call(headers('203.0.113.10'))).toBe('203.0.113.10');
        expect(await call(headers('198.51.100.1', 'forjado'))).toBe('104.28.0.7');
      } finally {
        await app.close();
        if (previous === undefined) delete process.env.PROXY_SHARED_SECRET;
        else process.env.PROXY_SHARED_SECRET = previous;
      }
    });
  });

  it('ignora X-Forwarded-For quando o proxy não é confiável', async () => {
    const app = fastify({ trustProxy: false });
    app.get('/', async (request) => ({
      tracker: await guard.tracker(
        request as unknown as Record<string, unknown>,
      ),
    }));
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/',
        remoteAddress: '203.0.113.9',
        headers: { 'x-forwarded-for': '198.51.100.99' },
      });
      expect(response.json<{ tracker: string }>().tracker).toBe('203.0.113.9');
    } finally {
      await app.close();
    }
  });
});
