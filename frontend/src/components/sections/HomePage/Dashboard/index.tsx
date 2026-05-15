import { PageTransition } from '@/components/shared/PageTransition';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardStats } from '@/hooks/useDashboard';
import { OverviewCards } from '@/components/sections/HomePage/Dashboard/OverviewCards';
import { DailyChallenge } from './DailyChallenge';


export function Dashboard() {
  const { user } = useCurrentUser();
  const { stats } = useDashboardStats();

  return (
    <PageTransition>
      <div className="flex flex-col gap-6 p-6">

        <InfoCard variant="primary">
          <InfoCard.Section className="flex items-start justify-between flex-wrap gap-4">
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
        <div className='grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-4'>
          <DailyChallenge />

        </div>        



      </div>
    </PageTransition>
  );
}
