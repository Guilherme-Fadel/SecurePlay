import fastify from 'fastify';
import { trustProxyFromEnv } from '../../config/trust-proxy';
import {
  AppThrottlerGuard,
  clientIp,
  edgeClientIp,
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
    const app = fastify({ trustProxy: trustProxyFromEnv('1') });
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
      expect(proxiedClientIp(headers('203.0.113.9'), secret)).toBe(
        '203.0.113.9',
      );
      expect(proxiedClientIp(headers('2001:db8::1'), secret)).toBe(
        '2001:db8::1',
      );
    });

    it('ignora o cabeçalho com segredo errado, ausente ou sem segredo configurado', () => {
      expect(
        proxiedClientIp(headers('203.0.113.9', 'outro'), secret),
      ).toBeNull();
      expect(
        proxiedClientIp({ [PROXY_CLIENT_IP_HEADER]: '203.0.113.9' }, secret),
      ).toBeNull();
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
      const app = fastify({ trustProxy: trustProxyFromEnv('1') });
      app.get('/', async (request) => ({
        tracker: await guard.tracker(
          request as unknown as Record<string, unknown>,
        ),
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
        expect(await call(headers('198.51.100.1', 'forjado'))).toBe(
          '104.28.0.7',
        );
      } finally {
        await app.close();
        if (previous === undefined) delete process.env.PROXY_SHARED_SECRET;
        else process.env.PROXY_SHARED_SECRET = previous;
      }
    });
  });

  describe('cabeçalho da borda (CLIENT_IP_HEADER)', () => {
    const previous = process.env.CLIENT_IP_HEADER;
    afterEach(() => {
      if (previous === undefined) delete process.env.CLIENT_IP_HEADER;
      else process.env.CLIENT_IP_HEADER = previous;
    });

    const trackerFor = async (headers: Record<string, string>) => {
      const app = fastify({ trustProxy: trustProxyFromEnv('1') });
      app.get('/', async (request) => ({
        tracker: await guard.tracker(
          request as unknown as Record<string, unknown>,
        ),
      }));
      try {
        const response = await app.inject({
          method: 'GET',
          url: '/',
          remoteAddress: '10.0.0.1',
          headers,
        });
        return response.json<{ tracker: string }>().tracker;
      } finally {
        await app.close();
      }
    };

    it('com CLIENT_IP_HEADER, X-Forwarded-For forjado não muda o tracker', async () => {
      process.env.CLIENT_IP_HEADER = 'CF-Connecting-IP';
      const trackers = await Promise.all(
        ['198.51.100.1', '198.51.100.2', '198.51.100.3'].map((forged) =>
          trackerFor({
            'cf-connecting-ip': '203.0.113.9',
            'x-forwarded-for': forged,
          }),
        ),
      );
      expect(trackers).toEqual(['203.0.113.9', '203.0.113.9', '203.0.113.9']);
    });

    it('valor que não é IP no cabeçalho configurado é ignorado', async () => {
      process.env.CLIENT_IP_HEADER = 'cf-connecting-ip';
      expect(
        await trackerFor({
          'cf-connecting-ip': 'não-é-ip',
          'x-forwarded-for': '203.0.113.50',
        }),
      ).toBe('203.0.113.50');
    });

    it('sem CLIENT_IP_HEADER o cabeçalho da borda não é lido', async () => {
      delete process.env.CLIENT_IP_HEADER;
      expect(
        await trackerFor({
          'cf-connecting-ip': '203.0.113.9',
          'x-forwarded-for': '203.0.113.50',
        }),
      ).toBe('203.0.113.50');
    });

    it('o IP repassado pela Pages com segredo continua tendo prioridade', () => {
      const previousSecret = process.env.PROXY_SHARED_SECRET;
      process.env.PROXY_SHARED_SECRET = 'segredo-x';
      process.env.CLIENT_IP_HEADER = 'cf-connecting-ip';
      try {
        expect(
          clientIp({
            headers: {
              [PROXY_SECRET_HEADER]: 'segredo-x',
              [PROXY_CLIENT_IP_HEADER]: '192.0.2.7',
              'cf-connecting-ip': '203.0.113.9',
            },
            ip: '10.0.0.1',
          }),
        ).toBe('192.0.2.7');
        expect(
          clientIp({
            headers: { 'cf-connecting-ip': '203.0.113.9' },
            ip: '10.0.0.1',
          }),
        ).toBe('203.0.113.9');
        expect(
          edgeClientIp({ 'cf-connecting-ip': '203.0.113.9' }, ''),
        ).toBeNull();
      } finally {
        if (previousSecret === undefined)
          delete process.env.PROXY_SHARED_SECRET;
        else process.env.PROXY_SHARED_SECRET = previousSecret;
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
