import { EventEmitter2 } from '@nestjs/event-emitter';
import { EntityManager } from 'typeorm';
import { DailyCheckin } from '../../dashboard/daily-checkin.entity';
import { DailyCheckinService } from '../../dashboard/daily-checkin.service';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';
import { ActivityCompletion } from './activity-completion.entity';
import { ActivityCompletionService } from './activity-completion.service';
import { withSeasonXpTransaction } from './credit-season-xp';

jest.mock('./credit-season-xp', () => ({
  ...jest.requireActual<typeof import('./credit-season-xp')>(
    './credit-season-xp',
  ),
  withSeasonXpTransaction: jest.fn(),
}));

describe('Missão diária — check-in confirmado antes dos efeitos externos', () => {
  const now = new Date('2026-10-27T15:00:00Z');
  const build = () => {
    const state = {
      stats: {
        usuario_id: 7,
        total_points: 0,
        current_streak: 0,
        last_checkin_date: null,
      } as UsuarioStats,
      activities: [] as ActivityCompletion[],
      days: [] as DailyCheckin[],
      monthlyPoints: 0,
    };
    const matches = (row: object, where: object) =>
      Object.entries(where).every(
        ([key, value]) => Reflect.get(row, key) === value,
      );
    const activities = {
      findOne: jest.fn(({ where }: { where: object }) =>
        Promise.resolve(
          state.activities.find((row) => matches(row, where)) ?? null,
        ),
      ),
      findOneBy: jest.fn((where: object) =>
        Promise.resolve(
          state.activities.find((row) => matches(row, where)) ?? null,
        ),
      ),
      existsBy: jest.fn((where: object) =>
        Promise.resolve(state.activities.some((row) => matches(row, where))),
      ),
      find: jest.fn(() =>
        Promise.resolve(
          state.activities.filter((row) => !row.effects_processed),
        ),
      ),
      create: (row: object) => row,
      save: jest.fn((row: ActivityCompletion) => {
        const saved = { ...row, id: `completion-${state.activities.length}` };
        state.activities.push(saved);
        return Promise.resolve(saved);
      }),
      update: jest.fn((id: string, update: object) => {
        Object.assign(state.activities.find((row) => row.id === id)!, update);
        return Promise.resolve({ affected: 1 });
      }),
    };
    const stats = {
      findOne: () => Promise.resolve({ ...state.stats }),
      findOneBy: () => Promise.resolve({ ...state.stats }),
      save: (row: UsuarioStats) => {
        state.stats = { ...row };
        return Promise.resolve(row);
      },
    };
    const days = {
      insert: jest.fn((row: DailyCheckin) => {
        state.days.push(row);
        return Promise.resolve();
      }),
      find: () => Promise.resolve(state.days),
    };
    const manager = {
      getRepository: (entity: unknown) => {
        if (entity === ActivityCompletion) return activities;
        if (entity === UsuarioStats) return stats;
        if (entity === DailyCheckin) return days;
        throw new Error('Repositório inesperado');
      },
      query: (_sql: string, params: [string, number, number]) => {
        state.monthlyPoints += params[2];
        return Promise.resolve();
      },
    };
    jest
      .mocked(withSeasonXpTransaction)
      .mockImplementation(async (_repo, _id, action) => {
        const before = structuredClone(state);
        try {
          return await action(
            manager as unknown as EntityManager,
            '2026-10',
            now,
          );
        } catch (error) {
          Object.assign(state, before);
          throw error;
        }
      });
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      acquireLease: jest.fn().mockResolvedValue(true),
      releaseLease: jest.fn().mockResolvedValue(undefined),
      applyActivityCompletion: jest.fn().mockResolvedValue(undefined),
    };
    const events = new EventEmitter2();
    const source = { getRepository: manager.getRepository };
    const service = new ActivityCompletionService(
      source as never,
      redis as never,
      events,
    );
    const checkins = new DailyCheckinService(
      source as never,
      service,
      {} as never,
      redis as never,
    );
    const complete = () =>
      service.complete(7, 'challenge', 5, () =>
        Promise.resolve({
          xp: 150,
          result: { completed: true, pointsEarned: 150 },
        }),
      );
    return { state, days, redis, events, service, checkins, complete };
  };

  beforeEach(() => jest.useFakeTimers({ now }));
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('a primeira consulta já encontra o check-in mesmo com Redis além de 250ms', async () => {
    const f = build();
    let release!: () => void;
    const delayed = new Promise<void>((resolve) => {
      release = resolve;
    });
    f.redis.applyActivityCompletion.mockImplementation(() => delayed);
    const request = f.complete();
    await jest.advanceTimersByTimeAsync(251);
    expect(await request).toEqual({ completed: true, pointsEarned: 150 });
    expect(await f.checkins.weekly(7)).toMatchObject({
      checkedToday: true,
      streak: 1,
    });
    expect(f.state.stats.total_points).toBe(155);
    expect(f.state.monthlyPoints).toBe(155);
    expect(
      f.state.activities.filter((row) => row.activity_type === 'checkin'),
    ).toHaveLength(1);
    release();
    await f.service.flushPending();
  });

  it('falha Redis deixa efeitos pendentes, mas preserva check-in e bônus confirmados', async () => {
    const f = build();
    f.redis.acquireLease.mockRejectedValue(new Error('Redis indisponível'));
    await expect(f.complete()).resolves.toMatchObject({ completed: true });
    expect(await f.checkins.weekly(7)).toMatchObject({
      checkedToday: true,
      streak: 1,
    });
    expect(f.state.stats.total_points).toBe(155);
    expect(f.state.activities.every((row) => !row.effects_processed)).toBe(
      true,
    );
  });

  it('repetir a missão ou registrar check-in depois não duplica o bônus', async () => {
    const f = build();
    await f.complete();
    await f.complete();
    await f.checkins.register(7);
    expect(f.state.stats.total_points).toBe(155);
    expect(f.state.days).toHaveLength(1);
    expect(f.state.activities).toHaveLength(2);
  });

  it('preserva check-in legado e não concede bônus retroativo', async () => {
    const f = build();
    Object.assign(f.state.stats, {
      total_points: 50,
      current_streak: 7,
      last_checkin_date: '2026-10-27',
    });
    await f.complete();
    expect(f.state.stats.total_points).toBe(200);
    expect(f.state.stats.current_streak).toBe(7);
    expect(f.state.days[0]).toMatchObject({
      bonus_xp: 0,
      refill_status: 'skipped',
    });
  });

  it.each([
    ['2026-10-26', 3, 4, 170],
    ['2026-10-25', 3, 1, 155],
  ])(
    'aplica a sequência existente de %s sem alterar a regra do bônus',
    async (day, streak, expectedStreak, expectedXp) => {
      const f = build();
      Object.assign(f.state.stats, {
        last_checkin_date: day,
        current_streak: streak,
      });
      await f.complete();
      expect(f.state.stats.current_streak).toBe(expectedStreak);
      expect(f.state.stats.total_points).toBe(expectedXp);
    },
  );

  it('entregar a outbox no dia seguinte não registra outro check-in para a missão', async () => {
    const f = build();
    f.redis.acquireLease.mockRejectedValue(new Error('Redis indisponível'));
    await f.complete();
    jest.setSystemTime(new Date('2026-10-28T15:00:00Z'));
    f.redis.acquireLease.mockResolvedValue(true);
    const events = jest.spyOn(f.events, 'emitAsync');
    await f.service.flushPending();
    expect(events).toHaveBeenCalledWith('progress.changed', {
      usuarioId: 7,
      skipCheckin: true,
    });
    expect(events).not.toHaveBeenCalledWith('progress.changed', {
      usuarioId: 7,
    });
    expect(f.state.days).toHaveLength(1);
    expect(f.state.stats.total_points).toBe(155);
  });

  it('propaga falha SQL para a transação, sem confirmar missão e XP parciais', async () => {
    const f = build();
    f.days.insert.mockRejectedValue(new Error('checkin SQL indisponível'));
    await expect(f.complete()).rejects.toThrow('checkin SQL indisponível');
    expect(f.state.stats.total_points).toBe(0);
    expect(f.state.activities).toHaveLength(0);
    expect(f.state.days).toHaveLength(0);
    expect(f.redis.acquireLease).not.toHaveBeenCalled();
  });

  it('fallback do próprio dia registra o check-in normalmente', async () => {
    const f = build();
    await f.checkins.registerForDay(7, '2026-10-27');
    expect(f.state.stats.total_points).toBe(5);
    expect(f.state.days).toHaveLength(1);
  });

  it('fallback que só adquire o lock no dia seguinte não concede outro check-in', async () => {
    const f = build();
    jest
      .mocked(withSeasonXpTransaction)
      .mockImplementation(async (_repo, _id, action) =>
        action(
          {} as EntityManager,
          '2026-10',
          new Date('2026-10-28T03:00:01Z'),
        ),
      );
    await expect(
      f.checkins.registerForDay(7, '2026-10-27'),
    ).resolves.toBeUndefined();
    expect(f.state.days).toHaveLength(0);
    expect(f.state.stats.total_points).toBe(0);
    expect(f.redis.acquireLease).not.toHaveBeenCalled();
  });

  it('fallback continua propagando falhas SQL reais para retry da outbox', async () => {
    const f = build();
    f.days.insert.mockRejectedValue(new Error('SQL indisponível'));
    await expect(f.checkins.registerForDay(7, '2026-10-27')).rejects.toThrow(
      'SQL indisponível',
    );
  });

  it.each([
    ['2026-10-27T15:00:00Z', false],
    ['2026-10-28T15:00:00Z', true],
  ])(
    'outbox legada entregue em %s respeita o dia original da missão',
    async (deliveryDate, skipCheckin) => {
      const f = build();
      f.state.activities.push({
        id: 'legacy-challenge',
        usuario_id: 7,
        activity_type: 'challenge',
        activity_id: 5,
        created_at: now,
        effects_processed: false,
        notifications: null,
      } as ActivityCompletion);
      jest.setSystemTime(new Date(deliveryDate));
      const events = jest.spyOn(f.events, 'emitAsync');
      await f.service.flushPending();
      expect(events).toHaveBeenCalledWith('progress.changed', {
        usuarioId: 7,
        ...(skipCheckin ? { skipCheckin: true } : { checkinDay: '2026-10-27' }),
      });
    },
  );
});
