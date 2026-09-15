import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchCached, getCached, isStale, subscribe } from '@/lib/queryCache';
import { useCurrentUser } from './useCurrentUser';
import { companyCacheKey } from '@/config/features';

interface UseCachedQueryOptions {
  staleTime?: number;
  enabled?: boolean;
}

interface UseCachedQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCachedQuery<T>(
  baseKey: string,
  fetcher: () => Promise<T>,
  options?: UseCachedQueryOptions,
): UseCachedQueryResult<T> {
  const { user } = useCurrentUser();
  const key = companyCacheKey(baseKey, user);
  const { staleTime, enabled = true } = options ?? {};
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const cached = getCached<T>(key);
  const [storedData, setStoredData] = useState<{ key: string; value: T | null }>({ key, value: cached });
  const activeKey = useRef<string | null>(null);
  const setData = useCallback((value: T | null) => {
    if (activeKey.current === key) setStoredData({ key, value });
  }, [key]);
  const [loading, setLoading] = useState(enabled && !cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    activeKey.current = enabled ? key : null;
    return () => { activeKey.current = null; };
  }, [enabled, key]);

  const refetch = useCallback(() => {
    if (!enabled) return;
    setError(null);
    if (!getCached<T>(key)) setLoading(true);
    fetchCached(key, fetcherRef.current)
      .then(result => {
        setData(result);
      })
      .catch(() => { if (activeKey.current === key) setError('Erro ao carregar dados'); })
      .finally(() => { if (activeKey.current === key) setLoading(false); });
  }, [enabled, key, setData]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }
    const currentCache = getCached<T>(key);
    setData(currentCache);
    setError(null);

    if (currentCache && !isStale(key, staleTime)) {
      setData(currentCache);
      setLoading(false);
      return;
    }

    if (currentCache) {
      setData(currentCache);
      setLoading(false);
      fetchCached(key, fetcherRef.current)
        .then(result => {
          setData(result);
        })
        .catch(() => {});
      return;
    }

    setLoading(true);
    fetchCached(key, fetcherRef.current)
      .then(result => {
        setData(result);
      })
      .catch(() => { if (activeKey.current === key) setError('Erro ao carregar dados'); })
      .finally(() => { if (activeKey.current === key) setLoading(false); });
  }, [enabled, key, staleTime, setData]);

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = subscribe(key, () => {
      const updated = getCached<T>(key);
      if (updated) {
        setData(updated);
      } else {
        refetch();
      }
    });
    return unsubscribe;
  }, [enabled, key, refetch, setData]);

  const current = storedData.key === key;
  return { data: enabled && current ? storedData.value : null, loading: enabled && (!current || loading), error: enabled && current ? error : null, refetch };
}
