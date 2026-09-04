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
  id: number;
  position: number;
  name: string;
  points: number;
  level: number;
  companyName?: string | null;
  isCurrentUser?: boolean;
  profileImageUrl?: string | null;
}

export interface RankingData {
  scope: 'global' | 'company';
  companyAvailable: boolean;
  company: { id: number; name: string } | null;
  totalParticipants: number;
  top: RankingEntry[];
  currentUser: RankingEntry;
  summary: {
    leaderPoints: number;
    pointsBehindLeader: number;
    pointsToNextPosition: number;
    percentile: number;
  };
}

export async function getDashboardRanking(
  scope: 'global' | 'company' = 'global',
): Promise<RankingData> {
  const response = await api.get('/dashboard/ranking', { params: { scope } });
  return response.data;
}

export interface JourneyNodeData {
  id: number;
  order: number;
  globalPosition: number;
  title: string;
  progress: number;
  totalAulas: number;
  completedAulas: number;
  hasStarted: boolean;
  lastAccessedAt: string | null;
  artworkUrl: string | null;
  nextAulaId: number | null;
  xpTotal: number;
  xpBonus: number;
  availability: 'available' | 'locked';
}

export interface JourneyStageData {
  key: string;
  title: string;
  order: number;
  theme: string;
  artworkUrl: string | null;
  nodes: JourneyNodeData[];
}

export interface JourneyData {
  summary: {
    totalModules: number;
    completedModules: number;
    totalLessons: number;
    completedLessons: number;
    progressPercent: number;
  };
  currentModuleId: number | null;
  stages: JourneyStageData[];
}

export async function getDashboardJourney(): Promise<JourneyData> {
  const response = await api.get('/dashboard/journey');
  return response.data;
}
