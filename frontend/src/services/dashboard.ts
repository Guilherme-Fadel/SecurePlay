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
  const response = await api.get('/challenges/daily');
  return response.data;
}

export interface WeeklyStreak {
  checkedDays: boolean[];
  todayIndex: number;
  streak: number;
  checkedToday: boolean;
}

export async function getWeeklyStreak(): Promise<WeeklyStreak> {
  const response = await api.get('/dashboard/streak');
  return response.data;
}

export interface CheckinResponse {
  message: string;
  checkedDays: boolean[];
  streak: number;
  bonusXp?: number;
}

export async function performCheckin(): Promise<CheckinResponse> {
  const response = await api.post('/dashboard/checkin');
  return response.data;
}
