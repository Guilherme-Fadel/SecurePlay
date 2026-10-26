import { arcadeFixture } from '../../test/fixtures/arcade-fixture';
import { TokenService } from '../arcade/token.service';
import { ActivityCompletion } from '../common/gamification/activity-completion.entity';
import { ActivityCompletionService } from '../common/gamification/activity-completion.service';
import {
  getLocalDateKey,
  getMondayOfWeek,
  getTodayWeekIndex,
} from '../common/utils/date.utils';
import { Usuario } from '../usuario/usuario.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { DailyCheckin } from './daily-checkin.entity';
import { DailyCheckinService } from './daily-checkin.service';
import { DailyCheckin1793404800000 } from '../database/migrations/1793404800000-daily-checkin';

const isolated =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;
isolated('C07 — check-in SQL e reposição Redis', () => {
  let f: Awaited<ReturnType<typeof arcadeFixture>>;
  let service: DailyCheckinService;
  let user: Usuario;
  const today = () => getLocalDateKey();
  const freezeDate = (now: Date) =>
    jest.useFakeTimers({
      now,
      doNotFake: [
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
      ],
    });
  const ledger = () =>
    f.source
      .getRepository(ActivityCompletion)
      .findOneByOrFail({ usuario_id: user.id, activity_type: 'checkin' });
  const status = () =>
    f.source
      .getRepository(DailyCheckin)
      .findOneByOrFail({ usuario_id: user.id, day: today() });
  const wireEffects = (instance = service) => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- emitAsync aguarda Promises do listener
    f.events.on('checkin.effects', (record: ActivityCompletion) =>
      instance.applyEffects(record),
    );
  };
  const clearFaults = async () => {
    await f.source.query('DROP TRIGGER IF EXISTS checkin_failure');
  };
  const fault = async (table: string, event: string, condition = '1 = 1') => {
    await f.source.query(
      `CREATE TRIGGER checkin_failure BEFORE ${event} ON ${table} FOR EACH ROW BEGIN IF ${condition} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fixture checkin failure'; END IF; END`,
    );
  };
  beforeAll(async () => {
    f = await arcadeFixture();
  }, 60_000);
  beforeEach(async () => {
    f.events.removeAllListeners();
    service = new DailyCheckinService(
      f.source,
      f.completions,
      f.tokens,
      f.redis,
    );
    user = await f.source
      .getRepository(Usuario)
      .save({ name: 'Checkin Fixture', password: 'fixture-unused' });
    wireEffects();
  });
  afterEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    await clearFaults();
  });
  afterAll(async () => {
    f?.redis.onModuleDestroy();
    await f?.source.destroy();
  });

  it('migração vazia suporta down/up e preserva o catálogo', async () => {
    const runner = f.source.createQueryRunner();
    try {
      const migration = new DailyCheckin1793404800000();
      await migration.down(runner);
      await migration.up(runner);
      expect(await runner.hasTable('daily_checkin')).toBe(true);
    } finally {
      await runner.release();
    }
  });

  it('12 requests e duas instâncias concedem um bônus e um refill', async () => {
    await f.tokens.consume(user.id);
    const other = new DailyCheckinService(
      f.source,
      new ActivityCompletionService(f.source, f.redis, f.events),
      f.tokens,
      f.redis,
    );
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        (index % 2 ? service : other).register(user.id),
      ),
    );
    expect(results.every((result) => result.bonusXp === 5)).toBe(true);
    expect(
      (
        await f.source
          .getRepository(UsuarioStats)
          .findOneByOrFail({ usuario_id: user.id })
      ).total_points,
    ).toBe(5);
    expect(
      await f.source
        .getRepository(DailyCheckin)
        .countBy({ usuario_id: user.id }),
    ).toBe(1);
    await f.tokens.consume(user.id);
    await service.register(user.id);
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
  });

  it('calendário do ledger é definido depois de esperar lock na virada do dia SP', async () => {
    const day = today();
    const beforeMidnight = new Date(`${day}T23:59:59-03:00`);
    jest.useFakeTimers({
      now: beforeMidnight,
      doNotFake: [
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
      ],
    });
    const runner = f.source.createQueryRunner();
    await runner.startTransaction();
    await runner.manager.getRepository(Usuario).findOneOrFail({
      where: { id: user.id },
      lock: { mode: 'pessimistic_write' },
    });
    const registration = service.register(user.id);
    try {
      let blocked = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        const waits: Array<{ total: string | number }> = await f.source.query(
          'SELECT COUNT(*) AS total FROM performance_schema.data_lock_waits',
        );
        if (Number(waits[0].total) > 0) {
          blocked = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(blocked).toBe(true);
      jest.setSystemTime(beforeMidnight.getTime() + 2000);
      await runner.commitTransaction();
      const result = await registration;
      expect(result.day).toBe(getLocalDateKey());
      expect(result.day).not.toBe(day);
      expect((await ledger()).activity_id).toBe(
        Number(result.day.replaceAll('-', '')),
      );
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await registration.catch(() => undefined);
      await runner.release();
    }
  });

  it('perder flag semanal não duplica bônus ou refill e semana vem do SQL', async () => {
    await service.register(user.id);
    await f.redis.del(`streak:${user.id}:${getMondayOfWeek()}`);
    await f.tokens.consume(user.id);
    await service.register(user.id);
    expect((await service.weekly(user.id)).checkedToday).toBe(true);
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
    expect((await ledger()).xp).toBe(5);
  });

  it('stats legado de hoje não recebe outro XP ou refill', async () => {
    await f.source.getRepository(UsuarioStats).save({
      usuario_id: user.id,
      total_points: 85,
      current_streak: 4,
      last_checkin_date: today(),
    });
    await f.tokens.consume(user.id);
    const result = await service.register(user.id);
    expect(result).toMatchObject({ bonusXp: 0, streak: 4, legacy: true });
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
    expect((await status()).refill_status).toBe('skipped');
  });

  it.each([1, 3])(
    'sequência com intervalo de %i dia(s) é calculada pelo calendário',
    async (gap) => {
      const date = new Date(`${today()}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - gap);
      await f.source.getRepository(UsuarioStats).save({
        usuario_id: user.id,
        total_points: 40,
        current_streak: 4,
        last_checkin_date: date.toISOString().slice(0, 10),
      });
      expect((await service.register(user.id)).streak).toBe(gap === 1 ? 5 : 1);
    },
  );

  it.each(['daily_checkin', 'ranking_season_points', 'activity_completion'])(
    'falha em %s reverte stats, bônus e entitlement',
    async (table) => {
      await fault(table, 'INSERT');
      await expect(service.register(user.id)).rejects.toThrow(
        'fixture checkin failure',
      );
      expect(
        await f.source
          .getRepository(UsuarioStats)
          .findOneBy({ usuario_id: user.id }),
      ).toBeNull();
      expect(
        await f.source
          .getRepository(DailyCheckin)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
      await clearFaults();
      expect((await service.register(user.id)).bonusXp).toBe(5);
    },
  );

  it('falha antes de iniciar o refill deixa outbox recuperável pelo worker', async () => {
    await fault('daily_checkin', 'UPDATE', "NEW.refill_status = 'started'");
    await f.tokens.consume(user.id);
    await service.register(user.id);
    expect((await status()).refill_status).toBe('pending');
    expect((await ledger()).effects_processed).toBe(false);
    await clearFaults();
    await f.completions.flushPending();
    expect((await status()).refill_status).toBe('done');
    expect((await f.tokens.getState(user.id)).balance).toBe(5);
  });

  it('falha depois do refill e consumo posterior não repõe outra vez', async () => {
    await fault('daily_checkin', 'UPDATE', "NEW.refill_status = 'done'");
    await service.register(user.id);
    expect((await status()).refill_status).toBe('started');
    await f.tokens.consume(user.id);
    await clearFaults();
    await f.completions.flushPending();
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
    expect((await status()).refill_status).toBe('done');
  });

  it.each(['same', 'missing', 'newer'])(
    'ack SQL perdido na virada preserva evidência do refill: %s',
    async (marker) => {
      const day = today();
      const beforeMidnight = new Date(`${day}T23:59:59-03:00`);
      freezeDate(beforeMidnight);
      await fault('daily_checkin', 'UPDATE', "NEW.refill_status = 'done'");
      await service.register(user.id);
      await f.tokens.consume(user.id);
      jest.setSystemTime(beforeMidnight.getTime() + 2000);
      if (marker === 'missing') {
        await f.redis.del(`op-tokens:${user.id}`);
        await f.tokens.consume(user.id);
      } else if (marker === 'newer') {
        await f.tokens.refillForCheckin(user.id, today(), true);
        await f.tokens.consume(user.id);
      }
      await clearFaults();
      await f.completions.flushPending();
      const row = await f.source
        .getRepository(DailyCheckin)
        .findOneByOrFail({ usuario_id: user.id, day });
      expect(row.refill_status).toBe(marker === 'same' ? 'done' : 'started');
      expect((await f.tokens.getState(user.id)).balance).toBe(4);
      expect((await ledger()).effects_processed).toBe(true);
    },
  );

  it('perda do saldo inteiro após tentativa não autoriza refill repetido', async () => {
    await fault('daily_checkin', 'UPDATE', "NEW.refill_status = 'done'");
    await service.register(user.id);
    await f.redis.del(`op-tokens:${user.id}`);
    await f.tokens.consume(user.id);
    await clearFaults();
    await f.completions.flushPending();
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
    expect((await status()).refill_status).toBe('started');
    expect((await ledger()).effects_processed).toBe(true);
  });

  it('resposta Redis perdida recupera prova no mesmo saldo após consumo', async () => {
    const real = new TokenService(f.redis);
    jest
      .spyOn(f.tokens, 'refillForCheckin')
      .mockImplementationOnce(async (...args) => {
        await real.refillForCheckin(...args);
        throw new Error('fixture resposta perdida');
      });
    await service.register(user.id);
    await f.tokens.consume(user.id);
    await f.completions.flushPending();
    expect((await status()).refill_status).toBe('done');
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
  });

  it('falha incerta antes do Lua não impede entregar XP/conquistas', async () => {
    const observed: number[] = [];
    f.events.on(
      'progress.changed',
      (payload: { usuarioId: number; skipCheckin?: boolean }) => {
        if (payload.skipCheckin) observed.push(payload.usuarioId);
      },
    );
    jest
      .spyOn(f.tokens, 'refillForCheckin')
      .mockRejectedValueOnce(new Error('fixture conexão perdida'));
    await f.tokens.consume(user.id);
    await service.register(user.id);
    await f.completions.flushPending();
    expect((await status()).refill_status).toBe('started');
    expect((await ledger()).effects_processed).toBe(true);
    expect(observed).toContain(user.id);
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
  });

  it('reprocessamento do dia anterior não repõe fichas no dia atual', async () => {
    f.events.removeAllListeners('checkin.effects');
    await service.register(user.id);
    const record = await ledger();
    const yesterday = new Date(`${today()}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const day = yesterday.toISOString().slice(0, 10);
    await f.source
      .getRepository(DailyCheckin)
      .update({ usuario_id: user.id, day: today() }, { day });
    record.activity_id = Number(day.replaceAll('-', ''));
    await f.tokens.consume(user.id);
    await service.applyEffects(record);
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
  });

  it('preserva bits legados válidos sem falhar se Redis ficar indisponível', async () => {
    await service.register(user.id);
    const days = Array<boolean>(7).fill(false);
    days[0] = true;
    await f.redis.set(
      `streak:${user.id}:${getMondayOfWeek()}`,
      JSON.stringify(days),
      600,
    );
    expect((await service.weekly(user.id)).checkedDays[0]).toBe(true);
    jest
      .spyOn(f.redis, 'get')
      .mockRejectedValueOnce(new Error('fixture redis down'));
    expect(
      (await service.weekly(user.id)).checkedDays[getTodayWeekIndex()],
    ).toBe(true);
  });

  it('rollback preenchido recusa remover o histórico', async () => {
    await service.register(user.id);
    const runner = f.source.createQueryRunner();
    try {
      await expect(
        new DailyCheckin1793404800000().down(runner),
      ).rejects.toThrow('Rollback bloqueado');
    } finally {
      await runner.release();
    }
  });
});
