import { ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { EmailService } from './email.service';

describe('E-mails de cadastro e orientação', () => {
  const keys = ['RESEND_API_KEY', 'EMAIL_FROM', 'PUBLIC_SITE_URL'] as const;
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  let fetchMock: jest.SpyInstance;
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'fixture-not-a-real-key';
    process.env.EMAIL_FROM = 'fixture@example.test';
    process.env.PUBLIC_SITE_URL = 'https://secureplay.example.test';
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
  });
  afterEach(() => {
    fetchMock.mockRestore();
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it.each(['sendVerification', 'sendPasswordSetup'] as const)(
    'preserva link fragmentado e idempotência em %s',
    async (method) => {
      await new EmailService()[method](
        'recipient@example.test',
        'fixture-token',
      );
      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const payload = JSON.parse(options.body as string) as { text: string };
      expect(payload.text).toContain(
        'https://secureplay.example.test/confirmar-email#fixture-token',
      );
      expect(options.headers).toMatchObject({
        'Idempotency-Key':
          'verify-' +
          createHash('sha256').update('fixture-token').digest('hex'),
      });
    },
  );

  it('orientação de conta existente não envia token nem link de ativação ou altera acesso', async () => {
    await new EmailService().sendAccessGuidance(
      'recipient@example.test',
      'fixture-request-id',
    );
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options.body as string) as {
      text: string;
      to: string[];
    };
    expect(payload.to).toEqual(['recipient@example.test']);
    expect(payload.text).toContain('https://secureplay.example.test/login');
    expect(payload.text).toContain('Sua conta não foi alterada');
    expect(payload.text).not.toContain('confirmar-email');
    expect(payload.text).not.toContain('fixture-request-id');
  });

  it('configuração inválida vira indisponibilidade sem enviar ou divulgar detalhes', async () => {
    process.env.PUBLIC_SITE_URL = 'invalid-site';
    await expect(
      new EmailService().sendVerification(
        'recipient@example.test',
        'fixture-token',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
