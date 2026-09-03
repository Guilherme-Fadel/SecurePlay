import { PageTransition } from '@/components/shared/PageTransition';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardStats } from '@/hooks/useDashboard';
import { ActiveTraining } from '@/components/sections/HomePage/Dashboard/ActiveTraining';
import { DailyChallenge } from './DailyChallenge';
import { useEffect } from 'react';
import { useSectionContext } from '@/contexts/SectionContext';
import { DailyStreak } from './DailyStreak';
import { RankingWidget } from './RankingWidget';
import { Map } from 'lucide-react';
import { Achievements } from './Achievements';
import { AppSectionHeader } from '@/components/ui/visuals/AppSectionHeader';
import { useAchievementShop } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';
import journeyMap from '@/assets/dashboard/journey-map-pixel-v2.png';
import heroArt from '@/assets/dashboard/welcome-adventurer-pixel-v3.png';


export function Dashboard() {
  const { user, loading: userLoading } = useCurrentUser();
  const { stats, loading: statsLoading } = useDashboardStats();
  const { setLoading, registerBootstrap, navigateToSection } = useSectionContext();
  const { data: cosmeticShop } = useAchievementShop();
  const equippedBackground = cosmeticShop?.equipped.find((item) => item.type === 'background')?.visualValue ?? '';

  useEffect(() => {
    registerBootstrap('dashboard');
  }, [registerBootstrap]);

  useEffect(() => {
    setLoading('dashboard', userLoading || statsLoading);
    return () => setLoading('dashboard', false);
  }, [userLoading, statsLoading, setLoading]);

  const totalPoints = stats?.totalPoints ?? 0;
  const xpMax = totalPoints + (stats?.xpToNextLevel ?? 0);
  const xpPercent = xpMax > 0 ? Math.round((totalPoints / xpMax) * 100) : 0;
  const completedMissions = stats?.completedChallenges ?? 0;
  const totalMissions = stats?.totalActiveChallenges ?? 0;

  return (
    <PageTransition>
      <div className="dashboard-real academy-dashboard flex flex-col gap-4 min-h-0 px-1 py-2">

        <InfoCard variant="primary" raised className={cn('dashboard-welcome academy-welcome cosmetic-background-host', equippedBackground)}>
          <img className="academy-welcome-art" src={heroArt} alt="Ilustração da Academia de Missões" />
          <div className="dashboard-welcome-content">
            <div className="dashboard-welcome-left">
              <div className="dashboard-welcome-info">
                <span className="academy-kicker">Academia de Missões</span>
                <h2>Olá, {user?.name?.split(' ')[0] ?? 'Agente'}!</h2>
                <p>Pronta para sua próxima descoberta?</p>

                <div className="dashboard-welcome-metrics">
                  <div>
                    <span>Rank</span>
                    <strong>#{stats?.globalRanking ?? '—'}</strong>
                  </div>
                  <div>
                    <span>Nível</span>
                    <strong>{stats?.level ?? '—'}</strong>
                  </div>
                  <div className="dashboard-welcome-xp">
                    <span>XP</span>
                    <strong>{stats ? totalPoints.toLocaleString('pt-BR') : '—'} <small>/ {xpMax.toLocaleString('pt-BR')}</small></strong>
                    <div className="dashboard-welcome-progress" aria-label={`${xpPercent}% do progresso de XP`}>
                      <i style={{ width: `${xpPercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </InfoCard>

        <div className="academy-dashboard-grid">
          <section className="dashboard-panel academy-journey-panel">
            <AppSectionHeader title="Sua jornada" />
            <div className="academy-journey-card">
              <img src={journeyMap} alt="Mapa em pixel art com o caminho da jornada" />
              <div className="academy-journey-footer">
                <div className="academy-journey-progress">
                  <div><span>Missões concluídas</span><strong>{completedMissions} / {totalMissions || '—'}</strong></div>
                  <div className="academy-progress-track"><i style={{ width: `${totalMissions ? Math.min(100, Math.round((completedMissions / totalMissions) * 100)) : 0}%` }} /></div>
                </div>
                <button className="academy-journey-map-button" type="button" aria-label="Abrir mapa da jornada" title="Abrir mapa da jornada" onClick={() => navigateToSection('conteudos')}>
                  <Map size={23} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          <section className="dashboard-panel dashboard-daily-panel academy-daily-panel">
            <AppSectionHeader title="Missão do dia" />
            <DailyChallenge />
          </section>

          <section className="dashboard-panel dashboard-streak-panel academy-streak-panel">
            <AppSectionHeader title="Sequência semanal" />
            <DailyStreak />
          </section>

          <div className="dashboard-left-column academy-training-area">
            <section className="dashboard-panel dashboard-training-panel">
              <AppSectionHeader
                title="Próximas aulas"
              />
              <ActiveTraining />
            </section>
          </div>

          <section className="dashboard-panel dashboard-achievements-panel academy-achievements-area">
            <AppSectionHeader
              title="Conquistas recentes"
            />
            <Achievements />
          </section>

          <section className="dashboard-panel dashboard-ranking-panel academy-ranking-area">
            <AppSectionHeader title="Ranking da turma" />
            <RankingWidget />
          </section>
        </div>

      </div>
    </PageTransition>
  );
}
