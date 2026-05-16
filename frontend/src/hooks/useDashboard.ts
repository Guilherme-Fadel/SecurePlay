import {
  DashboardStats,
  getDashboardStats,
  DashboardDailyChallenge,
  getDashboardDailyChallenge,
} from '@/services/dashboard';
import { useCachedQuery } from './useCachedQuery';

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
