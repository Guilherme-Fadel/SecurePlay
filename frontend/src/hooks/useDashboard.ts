import { useState, useEffect } from 'react';
import { DashboardStats, getDashboardStats } from '@/services/dashboard';

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Erro ao carregar estatísticas'))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}
