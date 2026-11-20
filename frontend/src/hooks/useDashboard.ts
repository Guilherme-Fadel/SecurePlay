import { DashboardStats, getDashboardStats, DashboardDailyChallenge, getDashboardDailyChallenge, WeeklyStreak, getWeeklyStreak, getDashboardRanking, getDashboardJourney, JourneyData, type RankingCategory, type RankingMode, type RankingUnit, } from '@/services/dashboard';
import { useCachedQuery } from './useCachedQuery';
import { useCompanyFeatures } from './useCompanyFeatures';
export function useDashboardStats() {
    const { data: stats, loading, error } = useCachedQuery<DashboardStats>('dashboardStats', getDashboardStats, { refetchInterval: 60_000 });
    return { stats, loading, error };
}
export function useDailyChallenge() {
    const { data: challenge, loading, error } = useCachedQuery<DashboardDailyChallenge>('dashboardDaily', getDashboardDailyChallenge, { refetchInterval: 60_000 });
    return { challenge, loading, error };
}
export function useWeeklyStreak() {
    const { data: streak, loading, error } = useCachedQuery<WeeklyStreak>('weeklyStreak', getWeeklyStreak, { refetchInterval: 60_000 });
    return { streak, loading, error };
}
export interface RankingQuery { season?: string; category?: RankingCategory; unit?: RankingUnit }
/** Categoria e unidade fazem parte da chave (cada combinação é outra resposta); sem elas a chave segue a de antes (Início e pré-carga). */
function rankingKey(scope: string, companyId: number | undefined, mode: RankingMode, query: RankingQuery): string {
    const view = query.category || query.unit ? `:${query.category ?? 'xp'}:${query.unit ?? 'students'}` : '';
    return `dashboardRanking:${scope}:${companyId ?? 'self'}:${mode}:${query.season ?? 'none'}${view}`;
}
export function useDashboardRanking(scope: 'global' | 'company' = 'global', companyId?: number, mode: RankingMode = 'current', query: RankingQuery = {}) {
    const features = useCompanyFeatures();
    const effectiveScope = features.globalRanking ? scope : 'company';
    const { season, category, unit } = query;
    const companyReady = effectiveScope !== 'company' || !companyId || companyId > 0;
    const { data, loading, error, refetch } = useCachedQuery(rankingKey(effectiveScope, companyId, mode, query), () => getDashboardRanking(effectiveScope, companyId, mode, season, { category, unit }), { staleTime: 30_000, refetchInterval: mode === 'season' ? undefined : 30_000, enabled: features.ranking && companyReady && (mode !== 'season' || !!season) });
    return { ranking: data, loading, error, refetch };
}
export function useDashboardJourney() {
    const { data, loading, error, refetch } = useCachedQuery<JourneyData>('dashboardJourney', getDashboardJourney, { staleTime: 45 * 60 * 1000, refetchInterval: 120_000 });
    return { journey: data, loading, error, refetch };
}
