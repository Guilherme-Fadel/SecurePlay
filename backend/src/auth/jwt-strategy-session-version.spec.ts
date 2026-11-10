import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { Role } from './roles.enum';
import { activeAccountSession } from './session';
import { Usuario } from '../usuario/usuario.entity';

describe('activeAccountSession', () => {
  it('aceita sessão de professor ativo', () => {
    expect(
      activeAccountSession(
        {
          active: true,
          session_version: 0,
          password_change_required: false,
          role: 'teacher',
        } as unknown as Usuario,
        0,
      ),
    ).toBe(true);
  });
});

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

  it('reaproveita a conta validada por pouco tempo e relê quando a versão muda', async () => {
    const getUsuarioById = jest
      .fn()
      .mockResolvedValueOnce({
        id: 4,
        active: true,
        session_version: 5,
        password_change_required: false,
        role: Role.USER,
      })
      .mockResolvedValueOnce({
        id: 4,
        active: true,
        session_version: 6,
        password_change_required: false,
        role: Role.USER,
      });
    const strategy = new JwtStrategy({ getUsuarioById } as never);
    const exp = Math.floor(Date.now() / 1000) + 60;

    await strategy.validate({ sub: 4, sessionVersion: 5, exp });
    await strategy.validate({ sub: 4, sessionVersion: 5, exp });
    expect(getUsuarioById).toHaveBeenCalledTimes(1);

    // Token de outra versão não passa pelo cache: relê a conta e rejeita o antigo.
    await expect(
      strategy.validate({ sub: 4, sessionVersion: 5, exp: exp + 1 }),
    ).resolves.toBeDefined();
    await expect(
      strategy.validate({ sub: 4, sessionVersion: 6, exp }),
    ).resolves.toBeDefined();
    expect(getUsuarioById).toHaveBeenCalledTimes(2);
  });
});
