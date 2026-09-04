import { api } from './api';

export type AchievementCategory = 'sentinel' | 'specialist' | 'investigator' | 'consistency' | 'elite';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type AchievementStatus = 'unlocked' | 'in_progress' | 'locked';

export interface AchievementNode {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
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
  status: AchievementStatus;
  unlockedAt: string | null;
  secret: boolean;
}

export interface AchievementTrail {
  summary: {
    unlocked: number;
    total: number;
    progressPercent: number;
    prestigeBalance: number;
    prestigeEarned: number;
    level: number;
  };
  metrics: {
    total_xp: number;
    level: number;
    challenges_completed: number;
    lessons_completed: number;
    streak: number;
    arcade_plays: number;
    perfect_arcade_runs: number;
  };
  nodes: AchievementNode[];
}

export interface RecentAchievements {
  summary: AchievementTrail['summary'];
  nodes: AchievementNode[];
}

export type CosmeticType = 'frame' | 'background' | 'title' | 'badge' | 'effect';

export interface CosmeticItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  type: CosmeticType;
  rarity: AchievementRarity;
  price: number;
  visualValue: string;
  requiredAchievementSlug: string | null;
  requirementMet: boolean;
  owned: boolean;
  equipped: boolean;
  affordable: boolean;
}

export interface AchievementShop {
  prestigeBalance: number;
  equipped: Array<{ type: CosmeticType; slug: string; visualValue: string }>;
  items: CosmeticItem[];
}

export async function getAchievementTrail(): Promise<AchievementTrail> {
  const response = await api.get('/achievements');
  return response.data as AchievementTrail;
}

export async function getRecentAchievements(): Promise<RecentAchievements> {
  const response = await api.get('/achievements/recent');
  return response.data as RecentAchievements;
}

export async function getAchievementShop(): Promise<AchievementShop> {
  const response = await api.get('/achievements/shop');
  return response.data as AchievementShop;
}

export async function purchaseCosmetic(itemId: number): Promise<AchievementShop> {
  const response = await api.post(`/achievements/shop/${itemId}/purchase`);
  return response.data as AchievementShop;
}

export async function equipCosmetic(itemId: number): Promise<AchievementShop> {
  const response = await api.post(`/achievements/shop/${itemId}/equip`);
  return response.data as AchievementShop;
}

export async function unequipCosmetic(type: CosmeticType): Promise<AchievementShop> {
  const response = await api.post(`/achievements/shop/type/${type}/unequip`);
  return response.data as AchievementShop;
}
