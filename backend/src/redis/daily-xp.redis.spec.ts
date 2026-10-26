import { randomInt } from 'crypto';
import { openArcadeRedis } from '../../test/fixtures/arcade-fixture';
import { RedisService } from './redis.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { ttlUntilEndOfDay } from '../common/utils/date.utils';

const isolated =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;
isolated('C09 — incremento concorrente do XP diário', () => {
  let redis: RedisService;
  let user: number;
  beforeAll(async () => {
    redis = await openArcadeRedis();
  });
  beforeEach(() => {
    user = randomInt(200_000_000, 300_000_000);
  });
  afterAll(() => {
    redis?.onModuleDestroy();
  });

  it('100 créditos simultâneos conservam a soma e o prazo de expiração', async () => {
    const key = `xp-today:${user}`;
    await Promise.all(
      Array.from({ length: 100 }, () =>
        redis.incrBy(key, 5, ttlUntilEndOfDay()),
      ),
    );
    const snapshot = await redis.getWithTtl(key);
    expect(snapshot?.value).toBe('500');
    expect(snapshot?.ttlMs).toBeGreaterThan(0);
    expect(snapshot?.ttlMs).toBeLessThanOrEqual(ttlUntilEndOfDay() * 1000);
  });

  it('crédito do Dashboard não lê saldo antigo e convive com outros produtores', async () => {
    const service = new DashboardService(
      {} as never,
      {} as never,
      {} as never,
      redis,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    // Exercita a fronteira Redis; crédito SQL de addPoints tem testes próprios.
    await Promise.all([
      service['incrementRedisXpToday'](user, 25),
      service['incrementRedisXpToday'](user, 50),
      redis.incrBy(`xp-today:${user}`, 10, ttlUntilEndOfDay()),
    ]);
    expect(await redis.get(`xp-today:${user}`)).toBe('85');
  });

  it('repara o TTL ausente sem apagar o saldo prévio', async () => {
    const key = `xp-today:${user}`;
    await redis.eval("return redis.call('SET', KEYS[1], '7')", [key], []);
    await redis.incrBy(key, 3, ttlUntilEndOfDay());
    expect((await redis.getWithTtl(key))?.value).toBe('10');
    expect((await redis.getWithTtl(key))?.ttlMs).toBeGreaterThan(0);
  });
});
