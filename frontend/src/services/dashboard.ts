import { api } from '@/services/api';

export interface DashboardStats {
  totalPoints: number;
  completedChallenges: number;
  globalRanking: number;
  xpToday: number;
  xpToNextLevel: number;
  level: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await api.get('/dashboard/stats');
  return response.data;
}
