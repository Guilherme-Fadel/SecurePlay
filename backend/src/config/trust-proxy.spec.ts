import fastify from 'fastify';
import { forwardedClientIp, trustProxyFromEnv } from './trust-proxy';

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

describe('forwardedClientIp — mesma regra do Fastify para requisição crua', () => {
  const cases: Array<[string | undefined, string | undefined]> = [
    ['1', undefined],
    ['1', '203.0.113.9'],
    ['1', '198.51.100.7, 203.0.113.9'],
    ['2', '198.51.100.7, 203.0.113.9'],
    ['2', '203.0.113.9'],
    ['3', '192.0.2.1, 198.51.100.7, 203.0.113.9'],
    [undefined, '198.51.100.7'],
    ['0', '198.51.100.7'],
  ];

  it.each(cases)('TRUST_PROXY=%s, XFF=%s', async (raw, forwardedFor) => {
    const setting = trustProxyFromEnv(raw);
    expect(forwardedClientIp('10.0.0.1', forwardedFor, setting)).toBe(
      await ipFor(setting, forwardedFor),
    );
  });

  it('aceita o cabeçalho repetido como lista', () => {
    expect(
      forwardedClientIp(
        '10.0.0.1',
        ['198.51.100.7', '203.0.113.9'],
        trustProxyFromEnv('1'),
      ),
    ).toBe('203.0.113.9');
  });
});
