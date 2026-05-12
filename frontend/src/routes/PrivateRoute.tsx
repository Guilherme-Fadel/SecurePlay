import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { validateToken } from '@/services/auth/validateToken';

type Status = 'checking' | 'valid' | 'invalid';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setStatus('invalid');
      return;
    }

    validateToken().then((valid) => {
      setStatus(valid ? 'valid' : 'invalid');
    });
  }, []);

  if (status === 'checking') {
    return null;
  }

  if (status === 'invalid') {
    localStorage.removeItem('token');
    localStorage.removeItem('nome');
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');

  if (token) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
