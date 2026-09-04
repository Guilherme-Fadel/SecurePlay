import { useState, useEffect, useCallback } from 'react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { getArcadeGames, getTokens, type ArcadeGameDto, type TokenState, } from '@/services/arcade';
export function useArcadeGames() {
    const { data, loading, error, refetch } = useCachedQuery<ArcadeGameDto[]>('arcade-games', getArcadeGames, { staleTime: 50 * 60 * 1000 });
    return { games: data ?? [], loading, error, refetch };
}
export function useTokens() {
    const [tokens, setTokens] = useState<TokenState | null>(null);
    const [loading, setLoading] = useState(true);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const load = useCallback(async () => {
        try {
            const t = await getTokens();
            setTokens(t);
            setSecondsLeft(t.nextRegenInSeconds);
        }
        catch {
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        load();
    }, [load]);
    useEffect(() => {
        if (!tokens || tokens.balance >= tokens.cap)
            return;
        if (secondsLeft <= 0) {
            load();
            return;
        }
        const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(id);
    }, [tokens, secondsLeft, load]);
    const setFromServer = useCallback((t: TokenState) => {
        setTokens(t);
        setSecondsLeft(t.nextRegenInSeconds);
    }, []);
    return { tokens, loading, secondsLeft, reload: load, setFromServer };
}
