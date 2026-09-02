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
import { Sparkles, Zap } from 'lucide-react';
import { Achievements } from './Achievements';
import { AppSectionHeader } from '@/components/ui/visuals/AppSectionHeader';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useAchievementShop } from '@/hooks/useAchievements';
import { Avatar } from '@/components/ui/visuals/Avatar';
import { cn } from '@/lib/utils';


export function Dashboard() {
  const { user, loading: userLoading } = useCurrentUser();
  const { stats, loading: statsLoading } = useDashboardStats();
  const { setLoading, registerBootstrap, navigateToSection } = useSectionContext();
  const { data: cosmeticShop } = useAchievementShop();
  const equippedFrame = cosmeticShop?.equipped.find((item) => item.type === 'frame')?.visualValue ?? '';
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

  return (
    <PageTransition>
      <div className="dashboard-real flex flex-col gap-3 lg:h-full min-h-0 px-1 py-2">

        <InfoCard variant="primary" raised className={cn('dashboard-welcome cosmetic-background-host', equippedBackground)}>
          <div className="dashboard-welcome-content">
            <div className="dashboard-welcome-left">
              <Avatar
                name={user?.name}
                nickname={user?.nickname}
                imageUrl={user?.profile_image_url}
                className={cn('dashboard-welcome-avatar cosmetic-avatar', equippedFrame)}
              >
                <i />
              </Avatar>
              <div className="dashboard-welcome-info">
                <h2>Bem-vindo de volta, {user?.name?.split(' ')[0] ?? '—'}!</h2>
                <p>Continue sua jornada de segurança e evolua no ranking.</p>

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

            <div className="dashboard-welcome-badges">
              <div className="dashboard-level-badge">
                <Zap size={15} />
                <span>Nível</span>
                <strong>{stats?.level ?? '—'}</strong>
              </div>
              <div className="dashboard-today-badge">
                <Sparkles size={15} />
                <span>Hoje</span>
                <strong>+{stats?.xpToday ?? 0} XP</strong>
              </div>
            </div>
          </div>
        </InfoCard>

        <div className="dashboard-main-grid lg:flex-1 lg:min-h-0">
          <div className="dashboard-left-column">
            <section className="dashboard-panel dashboard-training-panel">
              <AppSectionHeader
                title="Conteúdos pendentes"
                action={<AppButton variant="ghost" size="sm" onClick={() => navigateToSection('conteudos')}>Ver todos</AppButton>}
              />
              <ActiveTraining />
            </section>

            <section className="dashboard-panel dashboard-achievements-panel">
              <AppSectionHeader
                title="Conquistas recentes"
                action={<AppButton variant="ghost" size="sm" onClick={() => navigateToSection('conquistas')}>Ver todas</AppButton>}
              />
              <Achievements />
            </section>
          </div>

          <div className="dashboard-center-column">
            <section className="dashboard-panel dashboard-daily-panel">
              <AppSectionHeader title="Desafio do dia" />
              <DailyChallenge />
            </section>
          </div>

          <div className="dashboard-right-column">
            <section className="dashboard-panel dashboard-ranking-panel">
              <AppSectionHeader
                title="Ranking"
                action={<AppButton variant="ghost" size="sm" onClick={() => navigateToSection('ranking')}>Ver ranking</AppButton>}
              />
              <RankingWidget />
            </section>

            <section className="dashboard-panel dashboard-streak-panel">
              <AppSectionHeader title="Sequência semanal" />
              <DailyStreak />
            </section>
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
