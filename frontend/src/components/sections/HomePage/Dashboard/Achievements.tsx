import { ChevronRight, Award } from 'lucide-react';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { AchievementIcon } from '@/components/ui/visuals/AchievementIcon';
import { useAchievementTrail } from '@/hooks/useAchievements';
import { useSectionContext } from '@/contexts/SectionContext';

export function Achievements() {
  const { data: trail, loading, error, refetch } = useAchievementTrail();
  const { navigateToSection } = useSectionContext();

  if (loading && !trail) {
    return <InfoCard raised className="dashboard-achievements-card animate-pulse"><div className="h-full min-h-36" /></InfoCard>;
  }
  const recent = (trail?.nodes ?? [])
    .filter((node) => node.status === 'unlocked')
    .sort((a, b) => (Date.parse(b.unlockedAt ?? '') || 0) - (Date.parse(a.unlockedAt ?? '') || 0) || b.id - a.id)
    .slice(0, 3);

  return (
    <InfoCard raised className="dashboard-achievements-card">
      {error && !trail ? (
        <div className="academy-achievements-state" role="status">
          <p>Não foi possível carregar suas conquistas.</p>
          <button type="button" className="academy-footer-action" onClick={() => refetch()}>Tentar novamente</button>
        </div>
      ) : recent.length === 0 ? (
        <div className="academy-achievements-state">
          <Award size={28} aria-hidden="true" />
          <p>Sua primeira conquista está por vir.</p>
          <small>Explore as trilhas para descobrir como desbloqueá-la.</small>
        </div>
      ) : (
        <div className="academy-achievements-items">
          {recent.map((node) => (
            <div className="dashboard-achievement-item" key={node.id} title={node.description}>
              <div className="dashboard-achievement-icon is-purple"><AchievementIcon icon={node.icon} size={32} /></div>
              <div>
                <strong>{node.name}</strong>
                {node.rewardPrestige !== null && <p>+{node.rewardPrestige} Prestígio</p>}
                {node.unlockedAt && <time className="academy-achievement-date" dateTime={node.unlockedAt}>
                  {new Date(node.unlockedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </time>}
              </div>
            </div>
          ))}
        </div>
      )}
      <InfoCard.Footer className="academy-card-footer-link">
        <button type="button" className="academy-footer-action" onClick={() => navigateToSection('conquistas')}>Ver todas as conquistas <ChevronRight size={11} /></button>
      </InfoCard.Footer>
    </InfoCard>
  );
}
