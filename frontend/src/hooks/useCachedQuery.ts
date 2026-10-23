import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchCached, getCached, isStale, subscribe } from '@/lib/queryCache';
import { useCurrentUser } from './useCurrentUser';
import { companyCacheKey } from '@/config/features';

interface UseCachedQueryOptions {
  staleTime?: number;
  enabled?: boolean;
  keepPreviousDataOnInvalidate?: boolean;
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
  const { staleTime, enabled = true, keepPreviousDataOnInvalidate = false } = options ?? {};
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const cached = getCached<T>(key);
  const [storedData, setStoredData] = useState<{ key: string; value: T | null }>({ key, value: cached });
  const activeKey = useRef<string | null>(null);
  const requestVersion = useRef(0);
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
    const version = ++requestVersion.current;
    setError(null);
    if (!getCached<T>(key)) setLoading(true);
    fetchCached(key, fetcherRef.current)
      .then(result => {
        if (version === requestVersion.current && getCached<T>(key) === result) setData(result);
      })
      .catch(() => { if (activeKey.current === key && version === requestVersion.current) setError('Erro ao carregar dados'); })
      .finally(() => { if (activeKey.current === key && version === requestVersion.current) setLoading(false); });
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

    refetch();
  }, [enabled, key, staleTime, setData, refetch]);

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = subscribe(key, () => {
      const updated = getCached<T>(key);
      if (updated) {
        setData(updated);
      } else {
        if (!keepPreviousDataOnInvalidate) setData(null);
        refetch();
      }
    });
    return unsubscribe;
  }, [enabled, key, refetch, setData, keepPreviousDataOnInvalidate]);

  const current = storedData.key === key;
  const data = current ? storedData.value : cached;
  return { data: enabled ? data : null, loading: enabled && !data && (!current || loading), error: enabled && current ? error : null, refetch };
}
