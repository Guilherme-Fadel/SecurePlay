import {
  getRankingSeason,
  getRankingWeekStart,
  getSeasonWeekStarts,
  getSeasonXpByUser,
} from './ranking-season';
import type { RedisService } from '../redis/redis.service';

describe('monthly Ranking season', () => {
  it('starts in the middle of September with a September 1 boundary', () => {
    expect(
      getRankingSeason(new Date('2026-09-16T12:00:00-03:00')),
    ).toMatchObject({
      name: 'Temporada 1',
      status: 'active',
      startsAt: '2026-09-01T00:00:00-03:00',
      endsAt: '2026-10-01T00:00:00-03:00',
    });
    expect(getRankingWeekStart(new Date('2026-09-16T12:00:00-03:00'))).toBe(
      '2026-09-14',
    );
  });

  it('resets season and week at midnight on the first day of the next month', () => {
    const before = new Date('2026-09-30T23:59:59-03:00');
    const after = new Date('2026-10-01T00:00:00-03:00');
    expect(getRankingSeason(before).name).toBe('Temporada 1');
    expect(getRankingSeason(after)).toMatchObject({
      name: 'Temporada 2',
      startsAt: '2026-10-01T00:00:00-03:00',
      endsAt: '2026-11-01T00:00:00-03:00',
    });
    expect(getRankingWeekStart(after)).toBe('2026-10-01');
    expect(getSeasonWeekStarts(after)).toEqual(['2026-10-01']);
  });

  it('includes XP recorded earlier this month but excludes the previous month', async () => {
    const mget = jest.fn().mockResolvedValue(['0', '0', '100', '40', '0', '0']);
    const redis = { mget } as unknown as RedisService;
    const xp = await getSeasonXpByUser(
      redis,
      [1, 2],
      new Date('2026-09-16T12:00:00-03:00'),
    );
    expect(xp.get(1)).toBe(100);
    expect(xp.get(2)).toBe(40);
    expect(getSeasonWeekStarts(new Date('2026-09-16T12:00:00-03:00'))).toEqual([
      '2026-09-01',
      '2026-09-07',
      '2026-09-14',
    ]);
  });
});
