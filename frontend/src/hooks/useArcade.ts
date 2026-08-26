import { useState, useEffect, useCallback } from 'react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import {
  getArcadeGames,
  getTokens,
  type ArcadeGameDto,
  type TokenState,
} from '@/services/arcade';

/** Catalogo de jogos do arcade (cache stale-while-revalidate). */
export function useArcadeGames() {
  const { data, loading, error, refetch } = useCachedQuery<ArcadeGameDto[]>(
    'arcade-games',
    getArcadeGames,
    { staleTime: 60_000 },
  );
  return { games: data ?? [], loading, error, refetch };
}

/**
 * Saldo de tokens com contagem regressiva local ate a proxima regeneracao.
 * Revalida com o servidor ao montar e quando o cronometro zera.
 */
export function useTokens() {
  const [tokens, setTokens] = useState<TokenState | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const load = useCallback(async () => {
    try {
      const t = await getTokens();
      setTokens(t);
      setSecondsLeft(t.nextRegenInSeconds);
    } catch {
      // silencioso: a UI trata ausencia de saldo
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // cronometro local; ao zerar (e havendo regen pendente), revalida com o servidor.
  useEffect(() => {
    if (!tokens || tokens.balance >= tokens.cap) return;
    if (secondsLeft <= 0) {
      load();
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [tokens, secondsLeft, load]);

  // permite que a tela do jogo empurre o saldo retornado pelo start (evita refetch).
  const setFromServer = useCallback((t: TokenState) => {
    setTokens(t);
    setSecondsLeft(t.nextRegenInSeconds);
  }, []);

  return { tokens, loading, secondsLeft, reload: load, setFromServer };
}
