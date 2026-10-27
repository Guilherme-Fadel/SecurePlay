import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { initialAuthenticatedPath } from '@/components/admin/console/consoleNavigation';
import { AppButton } from '@/components/ui/buttons/AppButton';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { status, user, error, ensureSession, refreshSession } = useCurrentUser();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  if (status === 'idle' || status === 'loading') {
    return <div className="app-page" role="status">Verificando sua sessão...</div>;
  }

  if (status === 'unavailable') {
    return (
      <div className="app-page flex flex-col items-center justify-center gap-4 min-h-64">
        <p role="alert">{error}</p>
        <AppButton onClick={() => void refreshSession()}>Tentar novamente</AppButton>
      </div>
    );
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
    return <Navigate to={initialAuthenticatedPath(user)} replace />;
  }

  return children;
}
