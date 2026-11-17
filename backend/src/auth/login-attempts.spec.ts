import { HttpStatus, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Role } from './roles.enum';
import { MemoryRedis } from './login-attempts-test-support';
import {
  LOGIN_FAILURE_WINDOW_SECONDS,
  LoginAttemptsService,
  lockDurationMs,
  loginSubject,
} from './login-attempts.service';

const PASSWORD = 'senha-certa-123';

async function setup(redis: unknown = new MemoryRedis()) {
  const user = {
    id: 7,
    email: 'aluno@example.test',
    name: 'Aluno',
    active: true,
    role: Role.USER,
    password: await bcrypt.hash(PASSWORD, 4),
    email_verification_required: false,
    email_verified_at: new Date(),
    password_change_required: false,
  };
  const usuarioService = {
    getUsuarioByLoginIdentifier: jest.fn((identifier: string) =>
      Promise.resolve(
        identifier.trim().toLowerCase() === user.email ? user : undefined,
      ),
    ),
  };
  const jwtService = { sign: jest.fn().mockReturnValue('jwt') };
  const service = new AuthService(
    usuarioService as never,
    jwtService as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    new LoginAttemptsService(redis as never),
  );
  const login = (identifier: string, password: string) =>
    service.signIn({ identifier, password });
  const status = (identifier: string, password: string) =>
    login(identifier, password).then(
      () => 200,
      (error: { getStatus?: () => number }) => error.getStatus?.() ?? 500,
    );
  return { service, redis, jwtService, login, status };
}

describe('lockDurationMs — escala do bloqueio por conta', () => {
  it.each([
    [0, 0],
    [4, 0],
    [5, 30_000],
    [6, 60_000],
    [9, 480_000],
    [10, 900_000],
    [50, 900_000],
  ])('%i falhas → %i ms', (failures, ms) => {
    expect(lockDurationMs(failures)).toBe(ms);
  });

  it('bloqueio nunca passa de 15 min', () => {
    for (let failures = 0; failures <= 200; failures++)
      expect(lockDurationMs(failures)).toBeLessThanOrEqual(15 * 60_000);
  });
});

describe('loginSubject', () => {
  it('conta existente usa o id: variações de grafia caem no mesmo contador', () => {
    expect(loginSubject('ALUNO@Example.test', 7)).toBe('u:7');
    expect(loginSubject(' aluno@example.test ', 7)).toBe('u:7');
  });

  it('conta inexistente usa hash do identificador normalizado, sem o texto em claro', () => {
    const subject = loginSubject(' Naoexiste@Example.test ');
    expect(subject).toBe(loginSubject('naoexiste@example.test'));
    expect(subject).toMatch(/^i:[a-f0-9]{64}$/);
    expect(subject).not.toContain('naoexiste');
  });

  it('conta inexistente: variações com acento e maiúsculas geram o mesmo sujeito', () => {
    expect(loginSubject('maria@example.test')).toBe(
      loginSubject('mária@example.test'),
    );
    expect(loginSubject(' MÁRIA@Example.test ')).toBe(
      loginSubject('maria@example.test'),
    );
    expect(loginSubject('maria@example.test')).not.toBe(
      loginSubject('mario@example.test'),
    );
  });
});

describe('AuthService.signIn — bloqueio por conta', () => {
  it('6ª senha errada da mesma conta recebe 429 mesmo vindo de IPs diferentes', async () => {
    // O contador é por conta: o IP da requisição não participa da chave.
    const { status } = await setup();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++)
      statuses.push(await status('aluno@example.test', `errada-${i}`));
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });

  it('senha correta durante o bloqueio recebe 429', async () => {
    const { status, jwtService } = await setup();
    for (let i = 0; i < 5; i++) await status('aluno@example.test', 'errada');
    expect(await status('aluno@example.test', PASSWORD)).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('login bem-sucedido zera o contador', async () => {
    const { status } = await setup();
    for (let i = 0; i < 4; i++) await status('aluno@example.test', 'errada');
    expect(await status('aluno@example.test', PASSWORD)).toBe(200);
    const after: number[] = [];
    for (let i = 0; i < 4; i++)
      after.push(await status('aluno@example.test', 'errada'));
    expect(after).toEqual([401, 401, 401, 401]);
  });

  it('identificador inexistente segue a mesma regra', async () => {
    const { status } = await setup();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++)
      statuses.push(await status('naoexiste@example.test', 'qualquer'));
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });

  it('variação de maiúsculas no identificador não ganha contador novo', async () => {
    const { status } = await setup();
    for (let i = 0; i < 5; i++) await status('aluno@example.test', 'errada');
    expect(await status('ALUNO@EXAMPLE.TEST', 'errada')).toBe(429);
  });

  it('cada falha renova a janela de 1 h e o bloqueio fica no teto de 15 min', async () => {
    const redis = new MemoryRedis();
    const { status } = await setup(redis);
    for (let i = 0; i < 5; i++) await status('aluno@example.test', 'errada');
    expect(redis.ttls.get('login-fail:u:7')).toBe(LOGIN_FAILURE_WINDOW_SECONDS);
    expect(redis.ttls.get('login-lock:u:7')).toBe(30);
    for (let i = 0; i < 20; i++) {
      await redis.del('login-lock:u:7');
      await status('aluno@example.test', 'errada');
    }
    expect(redis.ttls.get('login-lock:u:7')).toBe(15 * 60);
  });

  it('40 tentativas erradas simultâneas: no máximo 5 avaliam a senha (só estas dão 401), as demais recebem 429', async () => {
    const { login } = await setup();
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        login('aluno@example.test', `errada-${i}`).then(
          () => 200,
          (error: { getStatus?: () => number }) => error.getStatus?.() ?? 500,
        ),
      ),
    );
    expect(results.filter((s) => s === 401)).toHaveLength(5);
    expect(results.filter((s) => s === 429)).toHaveLength(35);
  });

  it('Redis indisponível não impede o login e avisa no log', async () => {
    const down = () => Promise.reject(new Error('redis fora'));
    const broken = { eval: down, del: down };
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { status } = await setup(broken);
    expect(await status('aluno@example.test', 'errada')).toBe(401);
    expect(await status('aluno@example.test', PASSWORD)).toBe(200);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
