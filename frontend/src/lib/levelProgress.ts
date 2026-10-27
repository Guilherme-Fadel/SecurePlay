import type { DashboardStats } from '@/services/dashboard';

/** O nível zero começa em 0 XP; metas e nível vêm da autoridade do backend. */
export function levelProgress(stats: Pick<DashboardStats, 'totalPoints' | 'xpToNextLevel' | 'level'> | null) {
  if (!stats) return { range: 0, points: 0, percent: 0 };
  const target = stats.totalPoints + stats.xpToNextLevel;
  const range = target / (stats.level + 1);
  const points = Math.max(0, stats.totalPoints - (target - range));
  const percent = range > 0 ? Math.min(100, Math.round((points / range) * 1000) / 10) : 0;
  return { range, points, percent };
}
