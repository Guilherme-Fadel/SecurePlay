import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { Role } from './roles.enum';

describe('JwtStrategy session version', () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-123456';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it('aceita sessão criada após o status mais recente da conta', async () => {
    const strategy = new JwtStrategy({
      getUsuarioById: jest.fn().mockResolvedValue({
        id: 4,
        active: true,
        session_version: 5,
        password_change_required: false,
        role: Role.USER,
      }),
    } as never);

    await expect(
      strategy.validate({
        sub: 4,
        sessionVersion: 5,
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
    ).resolves.toMatchObject({ userId: 4, role: Role.USER });
  });

  it('rejeita token anterior à inativação mesmo depois da reativação', async () => {
    const strategy = new JwtStrategy({
      getUsuarioById: jest.fn().mockResolvedValue({
        id: 4,
        active: true,
        session_version: 6,
        password_change_required: false,
        role: Role.USER,
      }),
    } as never);

    await expect(
      strategy.validate({
        sub: 4,
        sessionVersion: 5,
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('mantém compatibilidade com tokens existentes quando a versão persistida é zero', async () => {
    const strategy = new JwtStrategy({
      getUsuarioById: jest.fn().mockResolvedValue({
        id: 4,
        active: true,
        session_version: 0,
        password_change_required: false,
        role: Role.USER,
      }),
    } as never);

    await expect(
      strategy.validate({ sub: 4, exp: Math.floor(Date.now() / 1000) + 60 }),
    ).resolves.toMatchObject({ userId: 4, sessionVersion: 0 });
  });
});
