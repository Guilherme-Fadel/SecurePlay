import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { status, ensureSession } = useCurrentUser();

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  if (status === 'idle' || status === 'loading') {
    return null;
  }

  if (status === 'unauthenticated') {
    localStorage.removeItem('nome');
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { status, ensureSession } = useCurrentUser();

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  if (status === 'idle' || status === 'loading') {
    return null;
  }

  if (status === 'authenticated') {
    return <Navigate to="/home" replace />;
  }

  return children;
}
