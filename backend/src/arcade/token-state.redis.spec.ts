import { randomInt, randomUUID } from 'crypto';
import { openArcadeRedis } from '../../test/fixtures/arcade-fixture';
import { RedisService } from '../redis/redis.service';
import { TokenService, TOKEN_REGEN_MS } from './token.service';
import { getLocalDateKey } from '../common/utils/date.utils';

class ClockTokens extends TokenService {
  current = 1_000_000_000_000;
  protected now() {
    return this.current;
  }
}
const isolated =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;
isolated('C06 — saldo/regeneração no Redis real', () => {
  let redis: RedisService;
  let tokens: ClockTokens;
  let user: number;
  beforeAll(async () => {
    redis = await openArcadeRedis();
  });
  beforeEach(() => {
    tokens = new ClockTokens(redis);
    user = randomInt(100_000_000, 200_000_000);
  });
  afterAll(() => {
    redis?.onModuleDestroy();
  });
  const balance = (amount: number, last = tokens.current) =>
    redis.set(
      `op-tokens:${user}`,
      JSON.stringify({ balance: amount, lastRegenAt: last }),
      600,
    );

  it('começa no teto para usuário novo', async () => {
    expect(await tokens.getState(user)).toMatchObject({
      balance: 5,
      nextRegenInSeconds: 0,
    });
  });
  it('não regenera antes do intervalo', async () => {
    await balance(2);
    tokens.current += TOKEN_REGEN_MS - 1000;
    expect((await tokens.getState(user)).balance).toBe(2);
  });
  it('regenera uma ficha após um intervalo', async () => {
    await balance(2);
    tokens.current += TOKEN_REGEN_MS;
    expect((await tokens.getState(user)).balance).toBe(3);
  });
  it('regenera N fichas sem ultrapassar teto', async () => {
    await balance(1);
    tokens.current += TOKEN_REGEN_MS * 3;
    expect((await tokens.getState(user)).balance).toBe(4);
    tokens.current += TOKEN_REGEN_MS * 100;
    expect((await tokens.getState(user)).balance).toBe(5);
  });
  it('saldo no teto reposiciona o início da próxima regeneração', async () => {
    await balance(5, tokens.current - TOKEN_REGEN_MS * 5);
    await tokens.getState(user);
    await tokens.consume(user);
    expect((await tokens.getState(user)).nextRegenAt).toBe(
      tokens.current + TOKEN_REGEN_MS,
    );
  });
  it('refill é atômico e recarrega até o teto', async () => {
    await balance(0);
    expect((await tokens.refillToCap(user)).balance).toBe(5);
  });
  it('refill de check-in preserva marcador após leitura, consume, run e refill normal', async () => {
    const day = getLocalDateKey(new Date(tokens.current));
    await tokens.refillForCheckin(user, day, true);
    await tokens.getState(user);
    await tokens.consume(user);
    await tokens.consumeForRun(
      user,
      randomUUID(),
      new Date(tokens.current + 1000),
    );
    expect(
      (await tokens.refillForCheckin(user, day, false)).state.balance,
    ).toBe(3);
    await tokens.refillToCap(user);
    await tokens.consume(user);
    expect(
      (await tokens.refillForCheckin(user, day, false)).state.balance,
    ).toBe(4);
  });
  it('recuperação sem marcador não altera saldo nem autoriza nova reposição', async () => {
    const day = getLocalDateKey(new Date(tokens.current));
    await tokens.consume(user);
    expect(await tokens.refillForCheckin(user, day, false)).toMatchObject({
      uncertain: true,
      state: { balance: 4 },
    });
    expect((await tokens.getState(user)).balance).toBe(4);
  });
  it('direito de check-in antigo expira, e dia novo permite nova reposição', async () => {
    const day = getLocalDateKey(new Date(tokens.current));
    await tokens.consume(user);
    tokens.current += 24 * 3600_000;
    expect((await tokens.refillForCheckin(user, day, true)).expired).toBe(true);
    await tokens.consume(user);
    const nextDay = getLocalDateKey(new Date(tokens.current));
    expect(
      (await tokens.refillForCheckin(user, nextDay, true)).state.balance,
    ).toBe(5);
  });
  it('100 leituras paralelas não restauram as fichas gastas por 20 consumos', async () => {
    const reads = Array.from({ length: 100 }, () => tokens.getState(user));
    const charges = Array.from({ length: 20 }, () => tokens.consume(user));
    await Promise.all(reads);
    expect(
      (await Promise.all(charges)).filter((result) => result.ok),
    ).toHaveLength(5);
    expect((await tokens.getState(user)).balance).toBe(0);
  });
  it('20 consumos do mesmo runId debitam uma ficha e devolvem um recibo estável', async () => {
    const id = randomUUID();
    const result = await Promise.all(
      Array.from({ length: 20 }, () =>
        tokens.consumeForRun(user, id, new Date(tokens.current + 1000)),
      ),
    );
    for (const item of result) expect(item).toEqual(result[0]);
    expect((await tokens.getState(user)).balance).toBe(4);
  });
  it('retry após expiração/refill não cobra ou sobrescreve o saldo atual', async () => {
    const id = randomUUID();
    const original = await tokens.consumeForRun(
      user,
      id,
      new Date(tokens.current + 1000),
    );
    tokens.current += TOKEN_REGEN_MS * 3;
    await tokens.refillToCap(user);
    expect(await tokens.consumeForRun(user, id, new Date(0))).toEqual(original);
    expect((await tokens.getState(user)).balance).toBe(5);
  });
  it('primeira cobrança expirada não debita nem cria recibo', async () => {
    const id = randomUUID();
    expect(
      await tokens.consumeForRun(user, id, new Date(tokens.current - 1)),
    ).toMatchObject({ ok: false, expired: true });
    expect(await tokens.hasRunReceipt(user, id)).toBe(false);
    expect((await tokens.getState(user)).balance).toBe(5);
  });

  it('lease só pode ser liberado pelo proprietário correspondente', async () => {
    const key = `fixture-lease:${user}`;
    expect(await redis.acquireLease(key, 'first', 1000)).toBe(true);
    expect(await redis.acquireLease(key, 'other', 1000)).toBe(false);
    await redis.releaseLease(key, 'other');
    expect(await redis.get(key)).toBe('first');
    await redis.releaseLease(key, 'first');
    expect(await redis.get(key)).toBeNull();
  });
});
