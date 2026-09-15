import { DashboardStats, getDashboardStats, DashboardDailyChallenge, getDashboardDailyChallenge, WeeklyStreak, getWeeklyStreak, getDashboardRanking, getDashboardJourney, JourneyData, } from '@/services/dashboard';
import { useCachedQuery } from './useCachedQuery';
import { useCompanyFeatures } from './useCompanyFeatures';
export function useDashboardStats() {
    const { data: stats, loading, error } = useCachedQuery<DashboardStats>('dashboardStats', getDashboardStats);
    return { stats, loading, error };
}
export function useDailyChallenge() {
    const { data: challenge, loading, error } = useCachedQuery<DashboardDailyChallenge>('dashboardDaily', getDashboardDailyChallenge);
    return { challenge, loading, error };
}
export function useWeeklyStreak() {
    const { data: streak, loading, error } = useCachedQuery<WeeklyStreak>('weeklyStreak', getWeeklyStreak);
    return { streak, loading, error };
}
export function useDashboardRanking(scope: 'global' | 'company' = 'global') {
    const features = useCompanyFeatures();
    const effectiveScope = features.globalRanking ? scope : 'company';
    const { data, loading, error, refetch } = useCachedQuery(`dashboardRanking:${effectiveScope}`, () => getDashboardRanking(effectiveScope), { staleTime: 45 * 60 * 1000, enabled: features.ranking });
    return { ranking: data, loading, error, refetch };
}
export function useDashboardJourney() {
    const { data, loading, error, refetch } = useCachedQuery<JourneyData>('dashboardJourney', getDashboardJourney, { staleTime: 45 * 60 * 1000 });
    return { journey: data, loading, error, refetch };
}
