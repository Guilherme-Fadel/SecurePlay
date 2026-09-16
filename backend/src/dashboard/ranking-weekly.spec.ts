import {
  loadRankingWeek,
  summarizeRankingWeek,
  type WeeklyRankingCandidate,
} from './ranking-weekly';
import type { RedisService } from '../redis/redis.service';
import type { UsuarioStats } from '../usuario-stats/usuario-stats.entity';

const candidate = (
  id: number,
  points: number,
  baselinePoints: number,
  xp: number,
  challenges: number,
): WeeklyRankingCandidate => ({
  id,
  points,
  baselinePoints,
  xp,
  challenges,
  streak: 0,
  lastCheckinDate: null,
});

describe('weekly ranking summary', () => {
  it('calculates movement from points before the first award of the week', () => {
    const summary = summarizeRankingWeek(
      [
        candidate(1, 200, 200, 0, 0),
        candidate(2, 250, 100, 150, 2),
        candidate(3, 50, 50, 0, 0),
      ],
      '2026-09-21',
    );

    expect(summary.changes.get(2)).toBe(1);
    expect(summary.changes.get(1)).toBe(-1);
    expect(summary.xp?.id).toBe(2);
    expect(summary.challenges?.id).toBe(2);
  });

  it('excludes a streak without a check-in in the current week', () => {
    const entries = [
      candidate(1, 200, 200, 0, 0),
      candidate(2, 100, 100, 0, 0),
    ];
    entries[0].streak = 30;
    entries[0].lastCheckinDate = '2026-09-20';
    entries[1].streak = 3;
    entries[1].lastCheckinDate = '2026-09-21';

    expect(summarizeRankingWeek(entries, '2026-09-21').streak).toMatchObject({
      id: 2,
      streak: 1,
    });
  });

  it('loads scoped weekly values and keeps names and avatars tied to the winning users', async () => {
    const redis = {
      get: jest.fn().mockResolvedValue('1900-01-01'),
      mget: jest.fn().mockResolvedValue(['0', '0', '150', '2']),
    } as unknown as RedisService;
    const stats = [
      {
        usuario_id: 1,
        total_points: 200,
        current_streak: 0,
        last_checkin_date: null,
        usuario: { name: 'Ana' },
      },
      {
        usuario_id: 2,
        total_points: 250,
        current_streak: 0,
        last_checkin_date: null,
        usuario: { name: 'Bia' },
      },
    ] as UsuarioStats[];
    const result = await loadRankingWeek({
      redis,
      getScopedStats: () => Promise.resolve(stats),
      currentUserId: 2,
      seasonPoints: new Map([
        [1, 200],
        [2, 250],
      ]),
      resolveProfileImageUrl: () => Promise.resolve(null),
    });

    expect(result.available).toBe(true);
    expect(result.changes?.get(2)).toBe(1);
    expect(
      result.highlights.find((item) => item.kind === 'xp')?.user.name,
    ).toBe('Bia');
    expect(
      result.highlights.find((item) => item.kind === 'challenges')?.value,
    ).toBe(2);
  });

  it('publishes current-week activity even when tracking starts midweek', async () => {
    const getScopedStats = jest.fn().mockResolvedValue([
      {
        usuario_id: 1,
        total_points: 783,
        current_streak: 0,
        last_checkin_date: null,
        usuario: { name: 'Belo' },
      },
    ]);
    const result = await loadRankingWeek({
      redis: {
        mget: jest.fn().mockResolvedValue(['100', '2']),
      } as unknown as RedisService,
      getScopedStats,
      currentUserId: 1,
      seasonPoints: new Map([[1, 100]]),
      resolveProfileImageUrl: () => Promise.resolve(null),
    });

    expect(result.available).toBe(true);
    expect(result.changes?.get(1)).toBe(0);
    expect(result.highlights.find((item) => item.kind === 'xp')?.value).toBe(
      100,
    );
    expect(
      result.highlights.find((item) => item.kind === 'challenges')?.value,
    ).toBe(2);
  });
});
