import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { PublicRegistrationService } from './public-registration.service';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { TURNSTILE_FAILED_MESSAGE } from './turnstile';

describe('RegistrationController — Turnstile nos formulários públicos', () => {
  const previous = process.env.TURNSTILE_SECRET_KEY;
  const publicRegistration = {
    startTrial: jest.fn().mockResolvedValue({ sucesso: true }),
    resend: jest.fn().mockReturnValue({ sucesso: true }),
    forgotPassword: jest.fn().mockReturnValue({ sucesso: true }),
  };
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RegistrationController],
      providers: [
        { provide: RegistrationService, useValue: {} },
        { provide: PublicRegistrationService, useValue: publicRegistration },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    if (previous === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previous;
  });

  beforeEach(() => jest.clearAllMocks());

  const trial = {
    name: 'Aluno Teste',
    email: 'novo@example.test',
    birth_date: '2012-01-01',
  };
  const post = (url: string, payload: object) =>
    app.inject({ method: 'POST', url: `/registration/${url}`, payload });

  it('com TURNSTILE_SECRET_KEY, cadastro sem token recebe 400', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'segredo-local';
    for (const [url, payload] of [
      ['trial', trial],
      ['resend', { email: 'a@example.test' }],
      ['forgot-password', { email: 'a@example.test' }],
    ] as const) {
      const response = await post(url, payload);
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: TURNSTILE_FAILED_MESSAGE,
        code: 'turnstile_failed',
      });
    }
    expect(publicRegistration.startTrial).not.toHaveBeenCalled();
    expect(publicRegistration.resend).not.toHaveBeenCalled();
    expect(publicRegistration.forgotPassword).not.toHaveBeenCalled();
  });

  it('sem TURNSTILE_SECRET_KEY os formulários seguem como antes', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect((await post('trial', trial)).statusCode).toBe(201);
    expect(publicRegistration.startTrial).toHaveBeenCalledTimes(1);
  });
});
