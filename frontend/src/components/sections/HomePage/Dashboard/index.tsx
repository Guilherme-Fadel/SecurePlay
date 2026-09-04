import { useEffect, useMemo } from 'react';
import { PageTransition } from '@/components/shared/PageTransition';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useDashboardJourney,
  useDashboardStats,
  useWeeklyStreak,
} from '@/hooks/useDashboard';
import { useSectionContext } from '@/contexts/SectionContext';
import { ActiveTraining } from './ActiveTraining';
import { DailyChallenge } from './DailyChallenge';
import { RankingWidget } from './RankingWidget';
import { Achievements } from './Achievements';
import { AdventureHero } from './AdventureHero';
import { JourneyPreview } from './JourneyPreview';
import type { JourneyNodeData } from '@/services/dashboard';
import '@/styles/hall-dashboard.css';

export function Dashboard() {
  const { user, loading: userLoading } = useCurrentUser();
  const { stats, loading: statsLoading } = useDashboardStats();
  const { streak } = useWeeklyStreak();
  const {
    journey,
    loading: journeyLoading,
    error: journeyError,
    refetch,
  } = useDashboardJourney();
  const {
    setLoading,
    registerBootstrap,
    navigateToSection,
    navigateToContent,
  } = useSectionContext();

  useEffect(() => registerBootstrap('dashboard'), [registerBootstrap]);
  useEffect(() => {
    setLoading('dashboard', userLoading || statsLoading);
    return () => setLoading('dashboard', false);
  }, [userLoading, statsLoading, setLoading]);

  const allNodes = useMemo(
    () => journey?.stages.flatMap((stage) => stage.nodes) ?? [],
    [journey],
  );
  const currentModule = allNodes.find(
    (node) => node.id === journey?.currentModuleId,
  );

  const openNode = (node: JourneyNodeData) => {
    navigateToContent({
      moduloId: node.id,
      ...(node.nextAulaId && node.hasStarted
        ? { aulaId: node.nextAulaId }
        : {}),
    });
  };
  const continueAdventure = () => {
    if (currentModule) openNode(currentModule);
    else navigateToSection('conteudos');
  };

  return (
    <PageTransition>
      <main className="hall-dashboard">
        <AdventureHero
          user={user}
          stats={stats}
          streak={streak}
          currentModule={currentModule}
          onContinue={continueAdventure}
        />

        <JourneyPreview
          journey={journey}
          loading={journeyLoading}
          error={journeyError}
          onOpenNode={openNode}
          onOpenAll={() => navigateToSection('conteudos')}
          onRetry={refetch}
        />

        <div className="hall-support-grid">
          <section className="hall-panel hall-training-panel" aria-labelledby="training-title">
            <header className="hall-section-heading"><div><span>PRÓXIMO PASSO</span><h2 id="training-title">Próximas aulas</h2></div></header>
            <ActiveTraining />
          </section>
          <section className="hall-panel hall-daily-panel" aria-labelledby="daily-title">
            <header className="hall-section-heading"><div><span>DESAFIO RÁPIDO</span><h2 id="daily-title">Missão do dia</h2></div></header>
            <DailyChallenge />
          </section>
          <section className="hall-panel hall-achievements-panel" aria-labelledby="achievements-title">
            <header className="hall-section-heading"><div><span>COLEÇÃO</span><h2 id="achievements-title">Conquistas recentes</h2></div></header>
            <Achievements />
          </section>
          <section className="hall-panel hall-ranking-panel" aria-labelledby="ranking-title">
            <header className="hall-section-heading"><div><span>PLACAR</span><h2 id="ranking-title">Ranking</h2></div></header>
            <RankingWidget />
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
