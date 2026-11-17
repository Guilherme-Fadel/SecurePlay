import { openArcadeRedis } from '../../test/fixtures/arcade-fixture';
import type { RedisService } from '../redis/redis.service';
import {
  LOGIN_FAILURE_WINDOW_SECONDS,
  LoginAttemptsService,
} from './login-attempts.service';

const isolated =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;

isolated('LoginAttemptsService — Redis real', () => {
  let redis: RedisService;
  let attempts: LoginAttemptsService;
  const subject = 'u:424242';
  const pttl = (key: string) =>
    redis.eval(
      "return redis.call('PTTL', KEYS[1])",
      [key],
      [],
    ) as Promise<number>;

  beforeAll(async () => {
    redis = await openArcadeRedis();
    attempts = new LoginAttemptsService(redis);
  });
  beforeEach(() => attempts.reset(subject));
  afterAll(async () => {
    await attempts.reset(subject);
    redis.onModuleDestroy();
  });

  it('4 falhas não bloqueiam; a 5ª bloqueia por 30 s', async () => {
    for (let i = 0; i < 4; i++) await attempts.registerFailure(subject);
    await expect(attempts.assertNotLocked(subject)).resolves.toBeUndefined();
    await attempts.registerFailure(subject);
    await expect(attempts.assertNotLocked(subject)).rejects.toMatchObject({
      status: 429,
    });
    const lock = await pttl(`login-lock:${subject}`);
    expect(lock).toBeGreaterThan(25_000);
    expect(lock).toBeLessThanOrEqual(30_000);
  });

  it('o contador expira em 1 h e cada falha renova a janela', async () => {
    await attempts.registerFailure(subject);
    await redis.eval(
      "redis.call('EXPIRE', KEYS[1], 60)",
      [`login-fail:${subject}`],
      [],
    );
    await attempts.registerFailure(subject);
    const ttl = await pttl(`login-fail:${subject}`);
    expect(ttl).toBeGreaterThan((LOGIN_FAILURE_WINDOW_SECONDS - 5) * 1000);
  });

  it('reset apaga contador e bloqueio', async () => {
    for (let i = 0; i < 5; i++) await attempts.registerFailure(subject);
    await attempts.reset(subject);
    expect(await pttl(`login-fail:${subject}`)).toBe(-2);
    expect(await pttl(`login-lock:${subject}`)).toBe(-2);
    await expect(attempts.assertNotLocked(subject)).resolves.toBeUndefined();
  });
});
