import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { ChevronRight } from 'lucide-react';
import { useDashboardRanking } from '@/hooks/useDashboard';
import { Avatar } from '@/components/ui/visuals/Avatar';
import { useSectionContext } from '@/contexts/SectionContext';

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

  const leaders = ranking.top.slice(0, 3);
  const currentUser = ranking.currentUser;
  const scopeLabel = ranking.scope === 'company' ? 'Minha turma' : 'Global';

  return (
    <InfoCard variant="accent" raised className="dashboard-ranking-card flex flex-col h-full min-h-0 overflow-hidden">
      <div className="dashboard-ranking-body">
        <span className="academy-ranking-preview-scope"><i aria-hidden="true" />{scopeLabel}</span>
        <ol className="academy-ranking-preview" aria-label="Três primeiros colocados">
          {leaders.map((entry) => (
            <li key={entry.id} className={`academy-ranking-preview-row rank-${entry.position}`}>
              <span className="academy-ranking-preview-position">#{entry.position}</span>
              <Avatar name={entry.name} imageUrl={entry.profileImageUrl} className="academy-ranking-avatar" />
              <strong title={entry.name}>{entry.name}</strong>
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
