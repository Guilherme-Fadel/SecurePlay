import { useState, useCallback, useRef } from 'react';

export function useHomeLoading() {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const bootstrapKeys = useRef(new Set<string>());
  const resolvedKeys = useRef(new Set<string>());

  const registerBootstrap = useCallback((key: string) => {
    bootstrapKeys.current.add(key);
  }, []);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingMap(prev => {
      if (prev[key] === loading) return prev;
      return { ...prev, [key]: loading };
    });

    if (!loading && bootstrapKeys.current.has(key)) {
      resolvedKeys.current.add(key);
      if (resolvedKeys.current.size >= bootstrapKeys.current.size) {
        setBootstrapReady(true);
      }
    }
  }, []);

  const isLoading = Object.values(loadingMap).some(v => v === true);

  return { isLoading, setLoading, bootstrapReady, registerBootstrap };
}
