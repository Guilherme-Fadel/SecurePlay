import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Crown } from 'lucide-react';
import { useDashboardRanking } from '@/hooks/useDashboard';
import { Avatar } from '@/components/ui/visuals/Avatar';
import type { RankingEntry } from '@/services/dashboard';

export function RankingWidget() {
  const { ranking, loading } = useDashboardRanking();

  if (loading || !ranking) {
    return (
      <InfoCard variant="accent" raised className="flex flex-col animate-pulse">
        <div className="p-4 h-64" />
      </InfoCard>
    );
  }

  const top3 = ranking.top.slice(0, 3);
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <InfoCard variant="accent" raised className="dashboard-ranking-card flex flex-col h-full min-h-0 overflow-hidden">
      <div className="dashboard-ranking-body">
        <p>Top 3 da sua turma</p>
        <div className="dashboard-podium flex items-end justify-center gap-2">
          {podium.map((entry) => (
            <PodiumColumn key={entry.position} entry={entry} />
          ))}
        </div>
      </div>
    </InfoCard>
  );
}

function PodiumColumn({ entry }: { entry: RankingEntry }) {
  const isFirst = entry.position === 1;
  const medal = entry.position === 1 ? 'Ouro' : entry.position === 2 ? 'Prata' : 'Bronze';
  return (
    <div className="dashboard-podium-column flex flex-col items-center gap-1 w-1/3">
      <div className="relative">
        {isFirst && (
          <Crown
            size={14}
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[var(--accent)] fill-[var(--accent)]"
          />
        )}
        <Avatar
          name={entry.name}
          imageUrl={entry.profileImageUrl}
          className="dashboard-podium-avatar w-9 h-9 rounded-full border-2 border-[var(--border)] bg-[var(--surface-alt)] flex items-center justify-center overflow-hidden text-[var(--text-primary)] font-[var(--font-family-base)]"
        />
      </div>

      <span className="dashboard-podium-name text-[var(--text-primary)] text-[11px] font-medium truncate max-w-full text-center leading-tight">
        {entry.name}
      </span>
      <span className="dashboard-podium-points text-[var(--text-secondary)] text-[10px] leading-none">
        {entry.points.toLocaleString('pt-BR')} XP
      </span>
      <span className={`dashboard-podium-medal medal-${entry.position}`}>{medal}</span>
    </div>
  );
}
