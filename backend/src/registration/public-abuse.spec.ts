import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EmailService } from './email.service';
import {
  DEFAULT_PUBLIC_EMAIL_DAILY_LIMIT,
  DEFAULT_RECOVERY_EMAIL_DAILY_LIMIT,
  publicEmailDailyLimit,
  recoveryEmailDailyLimit,
  runWithPublicEmailGate,
} from './public-email-budget';
import { PublicRegistrationService } from './public-registration.service';
import { assertTurnstile } from './turnstile';

describe('M3 — abuso de cadastro e e-mail', () => {
  const keys = [
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'PUBLIC_SITE_URL',
    'EMAIL_PUBLIC_DAILY_LIMIT',
    'EMAIL_RECOVERY_DAILY_LIMIT',
  ] as const;
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

  describe('orçamento diário dos fluxos públicos', () => {
    it('acima do orçamento diário não chama o provedor de e-mail', async () => {
      await expect(
        runWithPublicEmailGate(
          () => Promise.resolve(false),
          () => new EmailService().sendVerification('a@example.test', 'tok'),
        ),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('e-mail fora dos fluxos públicos (gestão) não consome o orçamento', async () => {
      await new EmailService().sendVerification('a@example.test', 'tok');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('conta só os envios e para no limite configurado', async () => {
      process.env.EMAIL_RECOVERY_DAILY_LIMIT = '2';
      const counters = new Map<string, number>();
      const redis = {
        incrBy: jest.fn((key: string, amount: number) => {
          const next = (counters.get(key) ?? 0) + amount;
          counters.set(key, next);
          return Promise.resolve(next);
        }),
      };
      const email = new EmailService();
      const registration = {
        requestPasswordReset: jest.fn((address: string) =>
          email.sendPasswordReset(address, 'tok', 30),
        ),
      };
      const service = new PublicRegistrationService(
        registration as never,
        email,
        redis as never,
      );
      for (let i = 0; i < 4; i++) service.forgotPassword(`a${i}@example.test`);
      await service.settled();
      expect(registration.requestPasswordReset).toHaveBeenCalledTimes(4);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('esgotar o cadastro não bloqueia o esqueci senha', async () => {
      process.env.EMAIL_PUBLIC_DAILY_LIMIT = '1';
      process.env.EMAIL_RECOVERY_DAILY_LIMIT = '5';
      const counters = new Map<string, number>();
      const redis = {
        incrBy: jest.fn((key: string, amount: number) => {
          const next = (counters.get(key) ?? 0) + amount;
          counters.set(key, next);
          return Promise.resolve(next);
        }),
      };
      const email = new EmailService();
      const registration = {
        startTrial: jest.fn(() =>
          email.sendVerification('novo@example.test', 'tok'),
        ),
        requestPasswordReset: jest.fn((address: string) =>
          email.sendPasswordReset(address, 'tok', 30),
        ),
      };
      const service = new PublicRegistrationService(
        registration as never,
        email,
        redis as never,
      );
      await service.startTrial({} as never);
      await service.startTrial({} as never);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      service.forgotPassword('a@example.test');
      service.forgotPassword('b@example.test');
      await service.settled();
      expect(fetchMock).toHaveBeenCalledTimes(3);
      const chaves = [...counters.keys()];
      expect(chaves.some((key) => key.includes(':cadastro:'))).toBe(true);
      expect(chaves.some((key) => key.includes(':recuperacao:'))).toBe(true);
    });

    it('Redis indisponível não bloqueia o envio', async () => {
      const service = new PublicRegistrationService(
        {
          resend: jest.fn(() =>
            new EmailService().sendVerification('a@example.test', 'tok'),
          ),
        } as never,
        new EmailService(),
        { incrBy: jest.fn().mockRejectedValue(new Error('down')) } as never,
      );
      service.resend('a@example.test');
      await service.settled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('limite de recuperação inválido usa o padrão', () => {
      expect(recoveryEmailDailyLimit('abc')).toBe(
        DEFAULT_RECOVERY_EMAIL_DAILY_LIMIT,
      );
      expect(recoveryEmailDailyLimit('150')).toBe(150);
    });

    it('limite inválido usa o padrão', () => {
      expect(publicEmailDailyLimit('abc')).toBe(
        DEFAULT_PUBLIC_EMAIL_DAILY_LIMIT,
      );
      expect(publicEmailDailyLimit('0')).toBe(DEFAULT_PUBLIC_EMAIL_DAILY_LIMIT);
      expect(publicEmailDailyLimit('300')).toBe(300);
    });
  });

  describe('Turnstile', () => {
    const verified = (success: boolean) =>
      jest
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ success }), { status: 200 }),
        ) as unknown as typeof fetch;

    it('sem TURNSTILE_SECRET_KEY a checagem fica desligada', async () => {
      const fetchImpl = verified(false);
      await expect(
        assertTurnstile(undefined, '203.0.113.9', '', fetchImpl),
      ).resolves.toBeUndefined();
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('com TURNSTILE_SECRET_KEY, cadastro sem token recebe 400', async () => {
      const fetchImpl = verified(true);
      await expect(
        assertTurnstile(undefined, '203.0.113.9', 'segredo', fetchImpl),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('token recusado pelo siteverify recebe 400', async () => {
      await expect(
        assertTurnstile('tok', '203.0.113.9', 'segredo', verified(false)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('token aceito passa e envia segredo, token e IP', async () => {
      const fetchImpl = verified(true);
      await expect(
        assertTurnstile('tok', '203.0.113.9', 'segredo', fetchImpl),
      ).resolves.toBeUndefined();
      const [, init] = (fetchImpl as unknown as jest.Mock).mock.calls[0] as [
        string,
        RequestInit,
      ];
      const body = init.body as URLSearchParams;
      expect(body.get('secret')).toBe('segredo');
      expect(body.get('response')).toBe('tok');
      expect(body.get('remoteip')).toBe('203.0.113.9');
    });

    it('falha de rede no siteverify recusa (falha fechada)', async () => {
      const fetchImpl = jest
        .fn()
        .mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
      await expect(
        assertTurnstile('tok', '203.0.113.9', 'segredo', fetchImpl),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
