import { openArcadeRedis } from '../../test/fixtures/arcade-fixture';
import type { RedisService } from '../redis/redis.service';
import {
  LOGIN_FAILURE_WINDOW_SECONDS,
  LoginAttemptsService,
  lockDurationMs,
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

  const reserve = () =>
    attempts.reserveAttempt(subject).then(
      () => true,
      () => false,
    );

  it('4 tentativas não bloqueiam; a 5ª liga o bloqueio de 30 s e a 6ª é recusada', async () => {
    for (let i = 0; i < 5; i++) expect(await reserve()).toBe(true);
    const lock = await pttl(`login-lock:${subject}`);
    expect(lock).toBeGreaterThan(25_000);
    expect(lock).toBeLessThanOrEqual(30_000);
    await expect(attempts.reserveAttempt(subject)).rejects.toMatchObject({
      status: 429,
    });
  });

  it('o script segue a escala de lockDurationMs', async () => {
    for (let i = 0; i < 5; i++) await reserve();
    await redis.del(`login-lock:${subject}`);
    await reserve();
    const lock = await pttl(`login-lock:${subject}`);
    expect(lock).toBeGreaterThan(lockDurationMs(6) - 5_000);
    expect(lock).toBeLessThanOrEqual(lockDurationMs(6));
  });

  it('rajada de 40 reservas simultâneas: só 5 passam', async () => {
    const results = await Promise.all(Array.from({ length: 40 }, reserve));
    expect(results.filter(Boolean)).toHaveLength(5);
  });

  it('o contador expira em 1 h e cada tentativa renova a janela', async () => {
    await reserve();
    await redis.eval(
      "redis.call('EXPIRE', KEYS[1], 60)",
      [`login-fail:${subject}`],
      [],
    );
    await reserve();
    const ttl = await pttl(`login-fail:${subject}`);
    expect(ttl).toBeGreaterThan((LOGIN_FAILURE_WINDOW_SECONDS - 5) * 1000);
  });

  it('reset apaga contador e bloqueio', async () => {
    for (let i = 0; i < 5; i++) await reserve();
    await attempts.reset(subject);
    expect(await pttl(`login-fail:${subject}`)).toBe(-2);
    expect(await pttl(`login-lock:${subject}`)).toBe(-2);
    await expect(attempts.reserveAttempt(subject)).resolves.toBeUndefined();
  });
});
