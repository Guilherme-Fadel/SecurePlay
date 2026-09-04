import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { ChevronRight, Crown } from 'lucide-react';
import { useDashboardRanking } from '@/hooks/useDashboard';
import { Avatar } from '@/components/ui/visuals/Avatar';
import type { RankingEntry } from '@/services/dashboard';
import { useSectionContext } from '@/contexts/SectionContext';
import podiumAsset from '@/assets/dashboard/ranking-podium-pixel-v1.png';

const formatPoints = (value: number) => value.toLocaleString('pt-BR');

export function RankingWidget() {
  const { ranking, loading, error, refetch } = useDashboardRanking('company');
  const { navigateToSection } = useSectionContext();

  if (loading && !ranking) {
    return (
      <InfoCard variant="accent" raised className="flex flex-col animate-pulse">
        <div className="p-4 h-64" />
      </InfoCard>
    );
  }

  if (error || !ranking) {
    return <InfoCard variant="accent" raised className="dashboard-ranking-card academy-widget-state"><p>Não foi possível carregar o ranking.</p><button type="button" className="academy-footer-action" onClick={refetch}>Tentar novamente</button></InfoCard>;
  }

  // Ordem de classificacao no DOM (1, 2, 3). A disposicao visual do podio
  // (2, 1, 3) e responsabilidade do CSS, que ancora cada rank no seu degrau.
  const podium = ranking.top.slice(0, 3);
  const currentUser = ranking.currentUser;

  return (
    <InfoCard variant="accent" raised className="dashboard-ranking-card flex flex-col h-full min-h-0 overflow-hidden">
      <div className="dashboard-ranking-body">
        <div className="academy-ranking-podium">
          <img className="academy-podium-base" src={podiumAsset} alt="" aria-hidden="true" />
          {podium.map((entry) => (
            <PodiumPlace key={entry.id} entry={entry} />
          ))}
        </div>
        <ol className="academy-podium-legend">
          {podium.map((entry) => (
            <li key={entry.id} className={`academy-podium-legend-item rank-${entry.position}`}>
              <span className="academy-ranking-name" title={entry.name}>{entry.name}</span>
              <b>{formatPoints(entry.points)} XP</b>
            </li>
          ))}
        </ol>
        <div className="academy-ranking-you">
          <span className="academy-ranking-you-position">#{currentUser.position}</span>
          <Avatar name={currentUser.name} imageUrl={currentUser.profileImageUrl} className="academy-ranking-avatar" />
          <span className="academy-ranking-you-identity">
            <small>Sua posição</small>
            <strong>{currentUser.name}</strong>
          </span>
          <b>{formatPoints(currentUser.points)} XP</b>
        </div>
      </div>
      <InfoCard.Footer className="academy-card-footer-link">
        <button type="button" className="academy-footer-action" onClick={() => navigateToSection('ranking')}>Ver ranking completo <ChevronRight size={11} /></button>
      </InfoCard.Footer>
    </InfoCard>
  );
}

function PodiumPlace({ entry }: { entry: RankingEntry }) {
  return (
    <div
      className={`academy-podium-place rank-${entry.position}`}
      title={`${entry.position}o lugar: ${entry.name}`}
    >
      {entry.position === 1 && <Crown className="academy-podium-crown" size={15} aria-hidden="true" />}
      <Avatar name={entry.name} imageUrl={entry.profileImageUrl} className="academy-ranking-avatar" />
    </div>
  );
}
