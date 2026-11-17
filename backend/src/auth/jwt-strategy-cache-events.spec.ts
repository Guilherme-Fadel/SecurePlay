import { UnauthorizedException } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { UsuarioService } from '../usuario/usuario.service';
import { JwtStrategy } from './jwt.strategy';
import { Role } from './roles.enum';
import { ACCOUNT_CHANGED_EVENT } from './session';

describe('JwtStrategy — invalidação do cache de conta no próprio processo (I6)', () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousTtl = process.env.AUTH_USER_CACHE_TTL_MS;
  const account = (sessionVersion: number, extra: object = {}) => ({
    id: 4,
    active: true,
    session_version: sessionVersion,
    password_change_required: false,
    role: Role.USER,
    ...extra,
  });

  beforeAll(() => {
    process.env.JWT_SECRET = 'x'.repeat(40);
    process.env.AUTH_USER_CACHE_TTL_MS = '10000';
  });
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousTtl === undefined) delete process.env.AUTH_USER_CACHE_TTL_MS;
    else process.env.AUTH_USER_CACHE_TTL_MS = previousTtl;
  });

  async function setup(after: object) {
    const getUsuarioById = jest
      .fn()
      .mockResolvedValueOnce(account(5))
      .mockResolvedValue(after);
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        JwtStrategy,
        { provide: UsuarioService, useValue: { getUsuarioById } },
      ],
    }).compile();
    await module.init();
    const strategy = module.get(JwtStrategy);
    const events = module.get(EventEmitter2);
    const token = {
      sub: 4,
      sessionVersion: 5,
      exp: Math.floor(Date.now() / 1000) + 60,
    };
    await strategy.validate(token);
    await strategy.validate(token);
    expect(getUsuarioById).toHaveBeenCalledTimes(1);
    return { strategy, events, token, module };
  }

  it('após trocar a senha, o JWT antigo é recusado na hora pelo mesmo processo', async () => {
    const { strategy, events, token, module } = await setup(account(6));
    events.emit('auth.sessions.revoked', { userId: 4, sessionVersion: 6 });
    await expect(strategy.validate(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await module.close();
  });

  it.each([
    ['usuario.inativado', account(5, { active: false })],
    [ACCOUNT_CHANGED_EVENT, account(6)],
  ])('%s descarta a conta guardada', async (event, after) => {
    const { strategy, events, token, module } = await setup(after);
    events.emit(event, { userId: 4 });
    await expect(strategy.validate(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await module.close();
  });

  it('evento de outra conta não afeta o cache', async () => {
    const { strategy, events, token, module } = await setup(account(6));
    events.emit(ACCOUNT_CHANGED_EVENT, { userId: 99 });
    await expect(strategy.validate(token)).resolves.toMatchObject({
      userId: 4,
    });
    await module.close();
  });
});
