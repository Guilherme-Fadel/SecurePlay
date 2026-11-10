import { useEffect, useMemo } from 'react';
import { PageTransition } from '@/components/shared/PageTransition';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardJourney, useDashboardStats, useWeeklyStreak } from '@/hooks/useDashboard';
import { useSectionContext, type ContentTarget } from '@/contexts/SectionContext';
import type { CurrentUser } from '@/services/me';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { DailyChallenge } from './DailyChallenge';
import { HomeHero } from './HomeHero';
import { HomeLevelWeek } from './HomeLevelWeek';
import { HomeJourney } from './HomeJourney';
import { HomeRanking } from './HomeRanking';
import { HomeAchievements } from './HomeAchievements';
import { buildHomeJourney, type HomeJourneyNode } from './homeJourneyModel';
import { bloqueioDaTurma } from '../Conteudos/lockCopy';
import '@/styles/home-start.css';

/** Gestão vê os mesmos cards do aluno (pedido do usuário); só muda a saudação. */
const MANAGEMENT_ROLES = new Set(['admin', 'platform_admin', 'teacher']);

/** Aula em andamento abre direto; módulo novo ou completo abre o livro do módulo. */
function contentTargetOf(node: HomeJourneyNode): ContentTarget {
  // Próxima aula fechada pela turma abre o módulo, não a aula bloqueada.
  const resume = !!node.nextAulaId && !bloqueioDaTurma(node.nextLessonLockReason) && (node.hasStarted || node.completedAulas > 0) && node.state !== 'done';
  return resume && node.nextAulaId ? { moduloId: node.id, aulaId: node.nextAulaId } : { moduloId: node.id };
}

function greetingFor(user: CurrentUser | null, management: boolean): string {
  const name = user?.nickname || user?.name?.split(' ')[0] || '';
  return `${management ? 'Olá' : 'Oi'}${name ? `, ${name}` : ''}!`;
}

function gridClass(ranking: boolean, achievements: boolean): string {
  return ['home-v-grid', ranking ? '' : 'is-without-ranking', achievements ? '' : 'is-without-achievements']
    .filter(Boolean)
    .join(' ');
}

export function Dashboard() {
  const features = useCompanyFeatures();
  const { user, loading: userLoading } = useCurrentUser();
  const management = MANAGEMENT_ROLES.has(user?.role ?? '');
  const { stats, loading: statsLoading } = useDashboardStats();
  const { streak } = useWeeklyStreak();
  const { journey, loading: journeyLoading, error: journeyError, refetch } = useDashboardJourney();
  const { setLoading, registerBootstrap, navigateToSection, navigateToContent } = useSectionContext();

  useEffect(() => registerBootstrap('dashboard'), [registerBootstrap]);
  useEffect(() => {
    setLoading('dashboard', userLoading || statsLoading);
    return () => setLoading('dashboard', false);
  }, [userLoading, statsLoading, setLoading]);

  const home = useMemo(() => buildHomeJourney(journey), [journey]);
  const summary = journey?.summary ?? null;

  const openNode = (node: HomeJourneyNode) => navigateToContent(contentTargetOf(node));
  const continueTrail = () => {
    if (home.current && home.current.state !== 'done') openNode(home.current);
    else navigateToSection('conteudos');
  };

  const greeting = greetingFor(user, management);
  const layout = gridClass(features.ranking, features.achievements);

  return (
    <PageTransition>
      <div className="home-v">
        <h1 className="hv-sr">{greeting} Este é o seu início.</h1>
        <div className={layout}>
          <HomeHero
            journey={home}
            summary={summary}
            loading={journeyLoading}
            error={!!journeyError}
            onRetry={refetch}
            onContinue={openNode}
            onReview={(node) => navigateToContent(node.lastCompletedAulaId ? { moduloId: node.id, aulaId: node.lastCompletedAulaId } : { moduloId: node.id })}
            onPlay={features.games.length > 0 ? () => navigateToSection('desafios') : undefined}
            onOpenLearn={() => navigateToSection('conteudos')}
          />
          <HomeLevelWeek stats={stats} streak={streak} />
          <DailyChallenge />
          <HomeJourney
            journey={home}
            summary={summary}
            loading={journeyLoading}
            error={!!journeyError}
            onRetry={refetch}
            onOpenNode={openNode}
          />
          {features.ranking && (
            <HomeRanking
              onContinue={continueTrail}
              onPractice={() => navigateToSection('desafios')}
              onOpenRanking={() => navigateToSection('ranking')}
              showPractice={features.games.length > 0}
            />
          )}
          {features.achievements && <HomeAchievements onOpen={() => navigateToSection('conquistas')} />}
        </div>
      </div>
    </PageTransition>
  );
}
