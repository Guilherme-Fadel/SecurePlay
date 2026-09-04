import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchCached, getCached, isStale, subscribe } from '@/lib/queryCache';

interface UseCachedQueryOptions {
  staleTime?: number;
}

interface UseCachedQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseCachedQueryOptions,
): UseCachedQueryResult<T> {
  const { staleTime } = options ?? {};
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const cached = getCached<T>(key);
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setError(null);
    if (!getCached<T>(key)) setLoading(true);
    fetchCached(key, fetcherRef.current)
      .then(result => {
        setData(result);
      })
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [key]);

  useEffect(() => {
    const currentCache = getCached<T>(key);

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
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [key, staleTime]);

  useEffect(() => {
    const unsubscribe = subscribe(key, () => {
      const updated = getCached<T>(key);
      if (updated) {
        setData(updated);
      } else {
        refetch();
      }
    });
    return unsubscribe;
  }, [key, refetch]);

  return { data, loading, error, refetch };
}
