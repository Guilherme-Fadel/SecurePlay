import {
  DashboardStats,
  getDashboardStats,
  DashboardDailyChallenge,
  getDashboardDailyChallenge,
  WeeklyStreak,
  getWeeklyStreak,
  performCheckin,
  getDashboardRanking,
} from '@/services/dashboard';
import { useCachedQuery } from './useCachedQuery';
import { useState } from 'react';
import { toast } from 'sonner';
import { setCache, invalidate } from '@/lib/queryCache';

export function useDashboardStats() {
  const { data: stats, loading, error } = useCachedQuery<DashboardStats>(
    'dashboardStats',
    getDashboardStats,
  );
  return { stats, loading, error };
}

export function useDailyChallenge() {
  const { data: challenge, loading, error } = useCachedQuery<DashboardDailyChallenge>(
    'dashboardDaily',
    getDashboardDailyChallenge,
  );
  return { challenge, loading, error };
}

export function useWeeklyStreak() {
  const { data: streak, loading, error } = useCachedQuery<WeeklyStreak>(
    'weeklyStreak',
    getWeeklyStreak,
  );

  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);
  const [localStreak, setLocalStreak] = useState<WeeklyStreak | null>(null);

  const doCheckin = async () => {
    setCheckinLoading(true);
    setCheckinMessage(null);
    try {
      const result = await performCheckin();
      setCheckinMessage(result.message);
      const updated: WeeklyStreak = {
        checkedDays: result.checkedDays,
        todayIndex: streak?.todayIndex ?? 0,
        streak: result.streak,
        checkedToday: true,
      };
      setLocalStreak(updated);
      setCache('weeklyStreak', updated);

      invalidate('dashboardStats');

      // Check-in recarrega as fichas do arcade no backend; avisa o usuario.
      toast.success('Fichas restauradas!', {
        description: result.message,
      });
    } catch {
      setCheckinMessage('Erro ao realizar check-in.');
      toast.error('Erro ao realizar check-in.');
    } finally {
      setCheckinLoading(false);
    }
  };

  return {
    streak: localStreak ?? streak,
    loading,
    error,
    doCheckin,
    checkinLoading,
    checkinMessage,
  };
}



export function useDashboardRanking() {
  const { data, loading, error } = useCachedQuery(
    'dashboardRanking',
    getDashboardRanking,
  );
  return { ranking: data, loading, error };
}
