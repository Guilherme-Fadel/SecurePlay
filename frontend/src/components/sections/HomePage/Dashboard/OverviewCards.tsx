import { Trophy, TrendingUp, Target, Award } from 'lucide-react';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useDashboardStats } from '@/hooks/useDashboard';

export function OverviewCards() {
  const { stats, loading } = useDashboardStats();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      <InfoCard variant="primary">
        <InfoCard.Section>
          <InfoCard.Stat
            label="Pontuação"
            value={loading ? '—' : stats?.totalPoints.toLocaleString('pt-BR') ?? '—'}
            subtitle={loading ? undefined : stats ? `+${stats.xpToday} esta semana` : undefined}
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
            subtitle={loading ? undefined : stats ? `${stats.xpToNextLevel} para o próximo nível` : undefined}
            icon={TrendingUp}
            variant="primary"
          />
        </InfoCard.Section>
      </InfoCard>

      <InfoCard>
        <InfoCard.Section>
          <InfoCard.Stat
            label="Desafios Concluídos"
            value={loading ? '—' : `${stats?.completedChallenges ?? 0}/100`}
            subtitle="1% Completado"
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
            subtitle="Top 5% da empresa"
            icon={Award}
          />
        </InfoCard.Section>
      </InfoCard>

    </div>
  );
}
