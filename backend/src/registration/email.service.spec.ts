import { ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { renderEmailHtml } from './email-layout';
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
      const payload = JSON.parse(options.body as string) as {
        text: string;
        html: string;
      };
      expect(payload.text).toContain(
        'https://secureplay.example.test/confirmar-email#fixture-token',
      );
      expect(payload.html).toContain(
        'href="https://secureplay.example.test/confirmar-email#fixture-token"',
      );
      expect(payload.html).toContain(
        'src="https://secureplay.example.test/email/secureplay-logo-blue.png?v=2"',
      );
      expect(payload.html).toContain('O link expira em até 24 horas.');
      expect(options.headers).toMatchObject({
        'Idempotency-Key':
          'verify-' +
          createHash('sha256').update('fixture-token').digest('hex'),
      });
    },
  );

  it('envia recuperação de senha para a tela de redefinição com validade informada', async () => {
    await new EmailService().sendPasswordReset(
      'recipient@example.test',
      'fixture-token',
      30,
    );
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options.body as string) as {
      subject: string;
      text: string;
      html: string;
    };
    const link =
      'https://secureplay.example.test/recuperar-acesso#fixture-token';
    expect(payload.subject).toBe('Recupere sua senha na SecurePlay');
    expect(payload.text).toContain(link);
    expect(payload.text).toContain('30 minutos');
    expect(payload.html).toContain(`href="${link}"`);
    expect(payload.html).toContain('Recuperação de senha');
    expect(payload.html).not.toContain('confirmar-email');
  });

  it('orientação de conta existente não envia token nem link de ativação ou altera acesso', async () => {
    await new EmailService().sendAccessGuidance(
      'recipient@example.test',
      'fixture-request-id',
    );
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options.body as string) as {
      text: string;
      html: string;
      to: string[];
    };
    expect(payload.to).toEqual(['recipient@example.test']);
    expect(payload.text).toContain('https://secureplay.example.test/login');
    expect(payload.text).toContain('Sua conta não foi alterada');
    expect(payload.html).toContain(
      'href="https://secureplay.example.test/login"',
    );
    expect(payload.html).toContain('Sua conta não foi alterada');
    for (const body of [payload.text, payload.html]) {
      expect(body).not.toContain('confirmar-email');
      expect(body).not.toContain('fixture-request-id');
    }
  });

  it('escapa conteúdo dinâmico no HTML', () => {
    const html = renderEmailHtml(
      'Assunto <teste>',
      {
        preheader: 'a',
        eyebrow: 'b',
        title: '<script>alert(1)</script>',
        highlight: 'c',
        paragraphs: ['d'],
        action: { label: 'e', url: 'https://example.test/?a=1&b="2"' },
        safety: 'f',
      },
      {
        home: 'https://example.test/',
        logo: 'https://example.test/logo.png',
        logoDark: 'https://example.test/logo-dark.png',
        symbol: 'https://example.test/symbol.png',
      },
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain(
      'href="https://example.test/?a=1&amp;b=&quot;2&quot;"',
    );
    expect(html).toContain('<title>Assunto &lt;teste&gt;</title>');
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
