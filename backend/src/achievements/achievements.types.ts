import { Achievement } from './entities/achievement.entity';

export interface AchievementMetrics {
  total_xp: number;
  level: number;
  challenges_completed: number;
  lessons_completed: number;
  streak: number;
  arcade_plays: number;
  perfect_arcade_runs: number;
}

export interface AchievementTrailNode {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: Achievement['category'];
  rarity: Achievement['rarity'];
  tier: number;
  icon: string;
  iconName: string;
  artworkUrl: string | null;
  rewardPrestige: number | null;
  prerequisiteSlug: string | null;
  position: { x: number; y: number };
  progress: number;
  target: number | null;
  progressPercent: number;
  status: 'unlocked' | 'in_progress' | 'locked';
  unlockedAt: Date | null;
  secret: boolean;
}

export interface AchievementTrailResponse {
  summary: {
    unlocked: number;
    total: number;
    progressPercent: number;
    prestigeBalance: number;
    prestigeEarned: number;
    level: number;
  };
  metrics: AchievementMetrics;
  nodes: AchievementTrailNode[];
}
