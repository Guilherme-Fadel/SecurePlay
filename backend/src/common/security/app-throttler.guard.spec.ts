import fastify from 'fastify';
import { AppThrottlerGuard } from './app-throttler.guard';

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
