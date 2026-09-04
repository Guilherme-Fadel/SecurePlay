import { AchievementRequirement } from './entities/achievement.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { UsuarioArcadeStats } from '../arcade/entities/usuario-arcade-stats.entity';
import { calcLevel } from '../common/utils/xp.utils';
import { AchievementMetrics } from './achievements.types';

/**
 * Monta as metricas de progresso a partir dos dados brutos ja consultados.
 * Funcao pura: nao acessa repositorio.
 */
export function buildMetrics(params: {
  stats: UsuarioStats | null;
  challenges_completed: number;
  lessons_completed: number;
  arcade: UsuarioArcadeStats[];
}): AchievementMetrics {
  const totalXp = params.stats?.total_points ?? 0;
  return {
    total_xp: totalXp,
    level: calcLevel(totalXp),
    challenges_completed: params.challenges_completed,
    lessons_completed: params.lessons_completed,
    streak: params.stats?.current_streak ?? 0,
    arcade_plays: params.arcade.reduce(
      (sum, item) => sum + item.total_plays,
      0,
    ),
    perfect_arcade_runs: params.arcade.reduce(
      (sum, item) => sum + item.perfect_runs,
      0,
    ),
  };
}

export function metricValue(
  metrics: AchievementMetrics,
  requirement: AchievementRequirement,
): number {
  return metrics[requirement];
}
