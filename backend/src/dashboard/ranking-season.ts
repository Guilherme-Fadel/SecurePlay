import { getLocalDateKey, getMondayOfWeek } from '../common/utils/date.utils';
import type { RedisService } from '../redis/redis.service';

const FIRST_SEASON_YEAR = 2026;
const FIRST_SEASON_MONTH = 9;

export function getRankingSeason(now: Date = new Date()) {
  const [year, month] = getLocalDateKey(now).split('-').map(Number);
  const index = (year - FIRST_SEASON_YEAR) * 12 + month - FIRST_SEASON_MONTH;
  const next = new Date(Date.UTC(year, month, 1));
  return {
    name: `Temporada ${index + 1}`,
    startsAt: `${year}-${String(month).padStart(2, '0')}-01T00:00:00-03:00`,
    endsAt: `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00-03:00`,
    status: 'active' as const,
  };
}

/** A semana que cruza uma virada de mês começa novamente no dia 1º. */
export function getRankingWeekStart(now: Date = new Date()): string {
  const monthStart = getRankingSeason(now).startsAt.slice(0, 10);
  const monday = getMondayOfWeek(now);
  return monday < monthStart ? monthStart : monday;
}

export function getSeasonWeekStarts(now: Date = new Date()): string[] {
  const monthStart = getRankingSeason(now).startsAt.slice(0, 10);
  const today = getLocalDateKey(now);
  const starts = [monthStart];
  const day = new Date(`${monthStart}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  while (day.toISOString().slice(0, 10) <= today) {
    if (day.getUTCDay() === 1) starts.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return starts;
}

export async function getSeasonXpByUser(
  redis: RedisService,
  userIds: number[],
  now: Date = new Date(),
): Promise<Map<number, number>> {
  const weeks = getSeasonWeekStarts(now);
  const values = await redis.mget(
    userIds.flatMap((id) =>
      weeks.map((week) => `ranking:week:${week}:xp:${id}`),
    ),
  );
  return new Map(
    userIds.map((id, index) => [
      id,
      weeks.reduce(
        (total, _week, weekIndex) =>
          total + Number(values[index * weeks.length + weekIndex] ?? 0),
        0,
      ),
    ]),
  );
}
