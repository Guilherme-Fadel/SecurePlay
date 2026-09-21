import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { status, user, ensureSession } = useCurrentUser();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  if (status === 'idle' || status === 'loading') {
    return null;
  }

  if (status === 'unauthenticated') {
    localStorage.removeItem('nome');
    return <Navigate to="/login" replace />;
  }

  if (user?.trial_ends_at && new Date(user.trial_ends_at).getTime() <= now) {
    return <Navigate to="/teste-encerrado" replace />;
  }

  return children;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { status, user, ensureSession } = useCurrentUser();

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  if (status === 'idle' || status === 'loading') {
    return null;
  }

  if (status === 'authenticated' && !(user?.trial_ends_at && new Date(user.trial_ends_at).getTime() <= Date.now())) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
