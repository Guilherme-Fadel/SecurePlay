import { useState, useCallback } from 'react';

export function useHomeLoading() {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingMap(prev => {
      if (prev[key] === loading) return prev;
      return { ...prev, [key]: loading };
    });
  }, []);

  const isLoading = Object.values(loadingMap).some(v => v === true);

  return { isLoading, setLoading };
}
