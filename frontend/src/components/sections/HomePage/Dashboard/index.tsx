import { PageTransition } from '@/components/shared/PageTransition';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardStats } from '@/hooks/useDashboard';
import { OverviewCards } from '@/components/sections/HomePage/Dashboard/OverviewCards';
import { DailyChallenge } from './DailyChallenge';
import { useEffect } from 'react';
import { useSectionContext } from '@/contexts/SectionContext';
import { DailyStreak } from './DailyStreak';
import { ActivityHistory } from './ActivityHistory';


export function Dashboard() {
  const { user, loading: userLoading } = useCurrentUser();
  const { stats, loading: statsLoading } = useDashboardStats();
  const { setLoading, registerBootstrap } = useSectionContext();

  useEffect(() => {
    registerBootstrap('dashboard');
  }, [registerBootstrap]);

  useEffect(() => {
    setLoading('dashboard', userLoading || statsLoading);
    return () => setLoading('dashboard', false);
  }, [userLoading, statsLoading, setLoading]);

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 lg:h-full lg:overflow-hidden">

        <InfoCard variant="primary">
          <InfoCard.Section className="flex items-center justify-between flex-wrap gap-4 py-3">
            <div>
              <h3 className="text-[var(--text-primary)] mb-1">
                Bem-vindo de volta, {user?.name ?? '—'}!
              </h3>
              <p className="text-[var(--text-secondary)]">
                Continue sua jornada de segurança.{' '}
                {stats && (
                  <>Você ganhou <span className="text-[var(--secondary)]">+{stats.xpToday} XP</span> hoje!</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <p className="text-[var(--text-secondary)]">Nível</p>
                <p className="text-[var(--text-primary)] font-semibold">{stats?.level ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-[var(--text-secondary)]">XP restantes</p>
                <p className="text-[var(--text-primary)] font-semibold">
                  {stats ? `${stats.xpToNextLevel} XP` : '—'}
                </p>
              </div>
            </div>
          </InfoCard.Section>
        </InfoCard>

        <OverviewCards />

        <div className="grid grid-cols-1 lg:grid-cols-[5.5fr_3fr] gap-4 lg:flex-1 lg:min-h-0">
          <DailyChallenge />
          <div className="flex flex-col gap-4 lg:min-h-0">
            <DailyStreak />
            <ActivityHistory />
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
