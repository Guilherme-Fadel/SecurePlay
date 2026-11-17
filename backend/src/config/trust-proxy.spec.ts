import fastify from 'fastify';
import { trustProxyFromEnv } from './trust-proxy';

async function ipFor(
  setting: ReturnType<typeof trustProxyFromEnv>,
  forwardedFor?: string,
) {
  const app = fastify({ trustProxy: setting });
  app.get('/', (request) => ({ ip: request.ip }));
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/',
      remoteAddress: '10.0.0.1',
      headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
    });
    return response.json<{ ip: string }>().ip;
  } finally {
    await app.close();
  }
}

describe('trustProxyFromEnv — contagem de saltos no Fastify 5.12+', () => {
  it('TRUST_PROXY=1 confia em um salto: usa a última entrada do X-Forwarded-For', async () => {
    expect(
      await ipFor(trustProxyFromEnv('1'), '198.51.100.7, 203.0.113.9'),
    ).toBe('203.0.113.9');
  });

  it('TRUST_PROXY=2 confia em dois saltos: usa a penúltima entrada', async () => {
    expect(
      await ipFor(trustProxyFromEnv('2'), '198.51.100.7, 203.0.113.9'),
    ).toBe('198.51.100.7');
  });

  it.each([undefined, '', '0', '-1', '1.5', 'abc'])(
    'TRUST_PROXY=%p não confia em proxy: usa o endereço da conexão',
    async (raw) => {
      expect(trustProxyFromEnv(raw)).toBe(false);
      expect(await ipFor(trustProxyFromEnv(raw), '203.0.113.9')).toBe(
        '10.0.0.1',
      );
    },
  );
});
