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
export function useDashboardRanking(scope: 'global' | 'company' = 'global', companyId?: number) {
    const features = useCompanyFeatures();
    const effectiveScope = features.globalRanking ? scope : 'company';
    const { data, loading, error, refetch } = useCachedQuery(`dashboardRanking:${effectiveScope}:${companyId ?? 'self'}`, () => getDashboardRanking(effectiveScope, companyId), { staleTime: 30_000, enabled: features.ranking && (effectiveScope !== 'company' || !companyId || companyId > 0) });
    return { ranking: data, loading, error, refetch };
}
export function useDashboardJourney() {
    const { data, loading, error, refetch } = useCachedQuery<JourneyData>('dashboardJourney', getDashboardJourney, { staleTime: 45 * 60 * 1000 });
    return { journey: data, loading, error, refetch };
}
