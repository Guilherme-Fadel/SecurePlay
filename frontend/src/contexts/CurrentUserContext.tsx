import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getMe, type CurrentUser } from '@/services/me';
import { clearQueryCache } from '@/lib/queryCache';

export type SessionStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

interface CurrentUserContextValue {
  user: CurrentUser | null;
  status: SessionStatus;
  loading: boolean;
  error: string | null;
  ensureSession: () => Promise<CurrentUser | null>;
  refreshSession: () => Promise<CurrentUser | null>;
  setSession: (user: CurrentUser) => void;
  clearSession: () => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const userRef = useRef<CurrentUser | null>(null);
  const statusRef = useRef<SessionStatus>('idle');
  const inFlightRef = useRef<Promise<CurrentUser | null> | null>(null);
  const requestVersionRef = useRef(0);

  const updateStatus = useCallback((nextStatus: SessionStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const setSession = useCallback((nextUser: CurrentUser) => {
    requestVersionRef.current += 1;
    inFlightRef.current = null;
    clearQueryCache();
    userRef.current = nextUser;
    setUser(nextUser);
    setError(null);
    updateStatus('authenticated');
  }, [updateStatus]);

  const clearSession = useCallback(() => {
    requestVersionRef.current += 1;
    inFlightRef.current = null;
    userRef.current = null;
    setUser(null);
    setError(null);
    updateStatus('unauthenticated');
    clearQueryCache();
  }, [updateStatus]);

  const loadSession = useCallback((force: boolean) => {
    if (!force && statusRef.current === 'authenticated' && userRef.current) {
      return Promise.resolve(userRef.current);
    }

    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const requestVersion = requestVersionRef.current;
    updateStatus('loading');
    setError(null);

    const request = getMe()
      .then((nextUser) => {
        if (requestVersion !== requestVersionRef.current) return userRef.current;
        userRef.current = nextUser;
        setUser(nextUser);
        updateStatus('authenticated');
        return nextUser;
      })
      .catch(() => {
        if (requestVersion !== requestVersionRef.current) return userRef.current;
        userRef.current = null;
        setUser(null);
        clearQueryCache();
        setError('Não foi possível validar a sessão');
        updateStatus('unauthenticated');
        return null;
      })
      .finally(() => {
        if (inFlightRef.current === request) {
          inFlightRef.current = null;
        }
      });

    inFlightRef.current = request;
    return request;
  }, [updateStatus]);

  const ensureSession = useCallback(() => loadSession(false), [loadSession]);
  const refreshSession = useCallback(() => loadSession(true), [loadSession]);

  const value = useMemo<CurrentUserContextValue>(() => ({
    user,
    status,
    loading: status === 'idle' || status === 'loading',
    error,
    ensureSession,
    refreshSession,
    setSession,
    clearSession,
  }), [user, status, error, ensureSession, refreshSession, setSession, clearSession]);

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUserContext(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error('useCurrentUser deve ser usado dentro de CurrentUserProvider');
  }
  return context;
}
