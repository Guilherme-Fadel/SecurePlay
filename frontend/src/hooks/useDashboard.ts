import { useState, useEffect } from 'react';
import {
  DashboardStats,
  getDashboardStats,
  DashboardDailyChallenge,
  getDashboardDailyChallenge,
} from '@/services/dashboard';

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

export function useDailyChallenge() {
  const [challenge, setChallenge] = useState<DashboardDailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardDailyChallenge()
      .then(setChallenge)
      .catch(() => setError('Erro ao carregar desafio diário'))
      .finally(() => setLoading(false));
  }, []);

  return { challenge, loading, error };
}
