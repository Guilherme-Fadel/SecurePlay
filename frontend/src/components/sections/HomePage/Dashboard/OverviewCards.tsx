import { Trophy, TrendingUp, Target, Award } from 'lucide-react';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useDashboardStats } from '@/hooks/useDashboard';

export function OverviewCards() {
  const { stats, loading } = useDashboardStats();

  const completionPercent = stats && stats.totalActiveChallenges > 0
    ? Math.round((stats.completedChallenges / stats.totalActiveChallenges) * 100)
    : 0;

  const rankingSubtitle = stats
    ? `Top ${stats.globalRanking} de ${stats.totalUsers} usuários`
    : undefined;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      <InfoCard variant="primary">
        <InfoCard.Section>
          <InfoCard.Stat
            label="Pontuação"
            value={loading ? '—' : stats?.totalPoints.toLocaleString('pt-BR') ?? '—'}
            subtitle={loading ? undefined : stats ? `+${stats.xpToday} XP hoje` : undefined}
            icon={Trophy}
            variant="accent"
          />
        </InfoCard.Section>
      </InfoCard>

      <InfoCard>
        <InfoCard.Section>
          <InfoCard.Stat
            label="Nível"
            value={loading ? '—' : stats?.level ?? '—'}
            subtitle={loading ? undefined : stats ? `${stats.xpToNextLevel} XP para o próximo nível` : undefined}
            icon={TrendingUp}
            variant="primary"
          />
        </InfoCard.Section>
      </InfoCard>

      <InfoCard>
        <InfoCard.Section>
          <InfoCard.Stat
            label="Desafios Concluídos"
            value={loading ? '—' : `${stats?.completedChallenges ?? 0}/${stats?.totalActiveChallenges ?? 0}`}
            subtitle={loading ? undefined : `${completionPercent}% Completado`}
            icon={Target}
            variant="secondary"
          />
        </InfoCard.Section>
      </InfoCard>

      <InfoCard>
        <InfoCard.Section>
          <InfoCard.Stat
            label="Ranking"
            value={loading ? '—' : stats ? `#${stats.globalRanking}` : '—'}
            subtitle={loading ? undefined : rankingSubtitle}
            icon={Award}
          />
        </InfoCard.Section>
      </InfoCard>

    </div>
  );
}
