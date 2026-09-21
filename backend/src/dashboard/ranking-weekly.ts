import type { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import type { RedisService } from '../redis/redis.service';
import { calcLevel } from '../common/utils/xp.utils';
import { getRankingWeekStart } from './ranking-season';

export interface WeeklyRankingCandidate {
  id: number;
  points: number;
  baselinePoints: number;
  xp: number;
  challenges: number;
  streak: number;
  lastCheckinDate: string | null;
}

export interface RankingWeekData {
  changes: Map<number, number> | null;
  available: boolean;
  highlights: Array<{
    kind: 'streak' | 'xp' | 'challenges';
    label: string;
    user: {
      id: number;
      position: number;
      name: string;
      points: number;
      level: number;
      companyName: string | null;
      isCurrentUser: boolean;
      profileImageUrl: string | null;
    };
    value: number;
    unit: string;
  }>;
}

export const unavailableRankingWeek = (): RankingWeekData => ({
  changes: null,
  available: false,
  highlights: [],
});

function positions(
  entries: WeeklyRankingCandidate[],
  score: (entry: WeeklyRankingCandidate) => number,
): Map<number, number> {
  const sorted = [...entries].sort(
    (a, b) => score(b) - score(a) || a.id - b.id,
  );
  const result = new Map<number, number>();
  let position = 0;
  let previousScore: number | null = null;
  sorted.forEach((entry, index) => {
    if (previousScore === null || score(entry) < previousScore) {
      position = index + 1;
      previousScore = score(entry);
    }
    result.set(entry.id, position);
  });
  return result;
}

export function summarizeRankingWeek(
  entries: WeeklyRankingCandidate[],
  weekStart: string,
) {
  const before = positions(entries, (entry) => entry.baselinePoints);
  const current = positions(entries, (entry) => entry.points);
  const changes = new Map(
    entries.map((entry) => [
      entry.id,
      (before.get(entry.id) ?? 0) - (current.get(entry.id) ?? 0),
    ]),
  );
  const winner = (metric: (entry: WeeklyRankingCandidate) => number) =>
    [...entries]
      .sort((a, b) => metric(b) - metric(a) || a.id - b.id)
      .find((entry) => metric(entry) > 0) ?? null;
  const streakMetric = (entry: WeeklyRankingCandidate) => {
    if (!entry.lastCheckinDate || entry.lastCheckinDate < weekStart) return 0;
    const daysInWeek =
      Math.floor(
        (Date.parse(`${entry.lastCheckinDate}T00:00:00Z`) -
          Date.parse(`${weekStart}T00:00:00Z`)) /
          86400000,
      ) + 1;
    return Math.min(entry.streak, daysInWeek);
  };
  const streakWinner = winner(streakMetric);
  return {
    changes,
    streak: streakWinner
      ? { ...streakWinner, streak: streakMetric(streakWinner) }
      : null,
    xp: winner((entry) => entry.xp),
    challenges: winner((entry) => entry.challenges),
  };
}

export async function loadRankingWeek(options: {
  redis: RedisService;
  getScopedStats: () => Promise<UsuarioStats[]>;
  currentUserId: number;
  seasonPoints: Map<number, number>;
  resolveProfileImageUrl: (
    key: string | null | undefined,
  ) => Promise<string | null>;
}): Promise<RankingWeekData> {
  const week = getRankingWeekStart();

  const allStats = await options.getScopedStats();
  const values = await options.redis.mget(
    allStats.flatMap((entry) => [
      `ranking:week:${week}:xp:${entry.usuario_id}`,
      `ranking:week:${week}:challenges:${entry.usuario_id}`,
    ]),
  );
  const candidates = allStats.map((entry, index) => ({
    id: entry.usuario_id,
    points: options.seasonPoints.get(entry.usuario_id) ?? 0,
    baselinePoints:
      (options.seasonPoints.get(entry.usuario_id) ?? 0) -
      Number(values[index * 2] ?? 0),
    xp: Number(values[index * 2] ?? 0),
    challenges: Number(values[index * 2 + 1] ?? 0),
    streak: entry.current_streak,
    lastCheckinDate: entry.last_checkin_date,
  }));
  const summary = summarizeRankingWeek(candidates, week);
  const highlights: RankingWeekData['highlights'] = [];
  for (const [kind, winner, unit, label, value] of [
    [
      'streak',
      summary.streak,
      'dias',
      'Maior sequência ativa',
      summary.streak?.streak,
    ],
    ['xp', summary.xp, 'XP', 'Mais XP conquistado', summary.xp?.xp],
    [
      'challenges',
      summary.challenges,
      'desafios',
      'Mais desafios',
      summary.challenges?.challenges,
    ],
  ] as const) {
    if (!winner || !value) continue;
    const entry = allStats.find((item) => item.usuario_id === winner.id);
    if (!entry) continue;
    highlights.push({
      kind,
      label,
      value,
      unit,
      user: {
        id: entry.usuario_id,
        position:
          allStats.filter(
            (item) =>
              (options.seasonPoints.get(item.usuario_id) ?? 0) >
              (options.seasonPoints.get(entry.usuario_id) ?? 0),
          ).length + 1,
        name:
          entry.usuario?.nickname ??
          (entry.usuario_id === options.currentUserId
            ? (entry.usuario?.name ?? 'Você')
            : `Aventureiro ${entry.usuario_id}`),
        points: options.seasonPoints.get(entry.usuario_id) ?? 0,
        level: calcLevel(entry.total_points),
        companyName: entry.usuario?.empresa?.nome ?? null,
        isCurrentUser: entry.usuario_id === options.currentUserId,
        profileImageUrl: await options.resolveProfileImageUrl(
          entry.usuario?.profile_image_key,
        ),
      },
    });
  }
  return { changes: summary.changes, available: true, highlights };
}
