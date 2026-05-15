import { api } from '@/services/api';

export interface DashboardStats {
  totalPoints: number;
  completedChallenges: number;
  totalActiveChallenges: number;
  globalRanking: number;
  totalUsers: number;
  xpToday: number;
  xpToNextLevel: number;
  level: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await api.get('/dashboard/stats');
  return response.data;
}

export interface DashboardDailyChallenge {
  id: number;
  title: string;
  description: string;
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  duration: number;
  points: number;
  active: boolean;
}

export async function getDashboardDailyChallenge(): Promise<DashboardDailyChallenge> {
  const response = await api.get('/dashboard/daily-challenge');
  return response.data;
}
