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
  image?: string | null;
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

export interface RankingEntry {
  position: number;
  name: string;
  points: number;
  level: number;
  isCurrentUser?: boolean;
}

export interface RankingData {
  top: RankingEntry[];
  currentUser: RankingEntry;
}

export async function getDashboardRanking(): Promise<RankingData> {
  try {
    const response = await api.get('/dashboard/ranking');
    return response.data;
  } catch {
    return MOCK_RANKING;
  }
}

const MOCK_RANKING: RankingData = {
  top: [
    { position: 1, name: 'Ana Prado', points: 12840, level: 24 },
    { position: 2, name: 'Bruno Reis', points: 11290, level: 22 },
    { position: 3, name: 'Carla Nunes', points: 10450, level: 21 },
    { position: 4, name: 'Diego Alves', points: 9320, level: 19 },
    { position: 5, name: 'Elisa Costa', points: 8710, level: 18 },
    { position: 6, name: 'Felipe Rocha', points: 8150, level: 17 },
    { position: 7, name: 'Gabriela Luz', points: 7690, level: 16 },
    { position: 8, name: 'Hugo Martins', points: 7020, level: 15 },
    { position: 9, name: 'Iris Farias', points: 6480, level: 14 },
    { position: 10, name: 'Joao Vieira', points: 5990, level: 13 },
  ],
  currentUser: {
    position: 12,
    name: 'Você',
    points: 4820,
    level: 11,
    isCurrentUser: true,
  },
};
