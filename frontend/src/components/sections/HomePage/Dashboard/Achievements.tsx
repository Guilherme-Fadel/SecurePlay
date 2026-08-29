import { Award, ShieldCheck } from 'lucide-react';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useDashboardStats } from '@/hooks/useDashboard';

export function Achievements() {
  const { stats, loading } = useDashboardStats();

  if (loading) {
    return (
      <InfoCard raised className="dashboard-achievements-card animate-pulse">
        <div className="h-full min-h-36" />
      </InfoCard>
    );
  }

  return (
    <InfoCard raised className="dashboard-achievements-card">
      <div className="dashboard-achievement-item">
        <div className="dashboard-achievement-icon is-yellow"><ShieldCheck size={21} /></div>
        <div>
          <strong>Missões concluídas</strong>
          <p>{stats?.completedChallenges ?? 0} de {stats?.totalActiveChallenges ?? 0} desafios finalizados</p>
        </div>
      </div>

      <div className="dashboard-achievement-item">
        <div className="dashboard-achievement-icon is-purple"><Award size={21} /></div>
        <div>
          <strong>Evolução do agente</strong>
          <p>Nível {stats?.level ?? 1} alcançado na academia</p>
        </div>
      </div>
    </InfoCard>
  );
}
