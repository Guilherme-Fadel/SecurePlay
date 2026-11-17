import * as bcrypt from 'bcrypt';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, TIMING_DUMMY_HASH } from './auth.service';
import {
  PUBLIC_PASSWORD_RESET_RESPONSE,
  PUBLIC_REGISTRATION_RESPONSE,
  PublicRegistrationService,
} from '../registration/public-registration.service';

jest.mock('bcrypt', () => {
  const actual = jest.requireActual<typeof import('bcrypt')>('bcrypt');
  return { ...actual, compare: jest.fn(actual.compare) };
});

const compare = bcrypt.compare as unknown as jest.Mock;

function authWith(user: unknown) {
  return new AuthService(
    { getUsuarioByLoginIdentifier: jest.fn().mockResolvedValue(user) } as never,
    { sign: jest.fn() } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {
      reserveAttempt: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    } as never,
  );
}

describe('B1 — tempo de resposta uniforme', () => {
  beforeEach(() => compare.mockClear());

  it('o hash fictício tem o mesmo custo das contas (10)', () => {
    expect(TIMING_DUMMY_HASH.split('$')[2]).toBe('10');
  });

  it('conta inexistente também executa bcrypt.compare', async () => {
    await expect(
      authWith(null).signIn({
        identifier: 'ninguem@example.test',
        password: 'x',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledWith('x', TIMING_DUMMY_HASH);
  });

  it('conta inativa também executa bcrypt.compare e continua recusada', async () => {
    const password = await bcrypt.hash('certa-123', 4);
    compare.mockClear();
    await expect(
      authWith({ id: 3, active: false, password }).signIn({
        identifier: 'inativa@example.test',
        password: 'certa-123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(compare).toHaveBeenCalledWith('certa-123', TIMING_DUMMY_HASH);
  });

  describe('fluxos públicos de e-mail', () => {
    function publicWith(registration: Record<string, jest.Mock>) {
      return new PublicRegistrationService(
        registration as never,
        {} as never,
        {} as never,
      );
    }

    it('esqueci senha responde antes de concluir o envio', async () => {
      let finish!: () => void;
      const requestPasswordReset = jest.fn(
        () => new Promise<void>((resolve) => (finish = resolve)),
      );
      const service = publicWith({ requestPasswordReset });
      const response = service.forgotPassword('aluno@example.test');
      expect(response).toEqual(PUBLIC_PASSWORD_RESET_RESPONSE);
      expect(requestPasswordReset).toHaveBeenCalledWith('aluno@example.test');
      finish();
      await service.settled();
    });

    it('falha no envio em segundo plano não muda a resposta nem fica sem tratamento', async () => {
      const resend = jest
        .fn()
        .mockRejectedValue(new ServiceUnavailableException('fixture'));
      const service = publicWith({ resend });
      expect(service.resend('x@example.test')).toEqual(
        PUBLIC_REGISTRATION_RESPONSE,
      );
      await expect(service.settled()).resolves.toBeUndefined();
    });
  });
});
