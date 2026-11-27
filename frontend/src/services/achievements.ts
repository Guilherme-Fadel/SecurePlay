import { api } from './api';
import type { CharacterColor } from '@/components/shared/Character/characterColor';
import type { LookPiece } from './dashboard';

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

/** Encaixes do personagem e temas (fundo e card); o backend é quem os cataloga. Moldura, título e emblema foram descontinuados (ver `LegacyCosmeticType`). */
export type CosmeticType = 'background' | 'effect' | 'skin' | 'head' | 'face' | 'neck' | 'card';

/** Tipos descontinuados: o banco ainda guarda os registros antigos, mas a loja não os lista nem aceita. Só o console admin pode encontrá-los. */
export type LegacyCosmeticType = 'frame' | 'title' | 'badge';

/** `festive` só existe em colecionáveis (não em conquistas). */
export type CosmeticRarity = AchievementRarity | 'festive';

export type UnlockMetric = 'xp_season' | 'xp_total' | 'rank' | 'access_days' | 'streak' | 'achievement';

/** Progresso de uma exigência. Em `rank`, `current = 0` significa sem posição (use `met` e `target`). */
export interface UnlockCondition {
  metric: UnlockMetric;
  label: string;
  current: number | boolean;
  /** Meta numérica; em `achievement`, o identificador da conquista. */
  target: number | string;
  met: boolean;
  /** Escopo da colocação; só em `rank`. */
  scope?: 'empresa' | 'global';
  /** Conquista legada do item: sempre obrigatória, mesmo no modo `any`. */
  required?: true;
}

export interface UnlockState {
  met: boolean;
  conditions: UnlockCondition[];
  /** Como as exigências da regra principal se combinam (`all` sem regra). */
  mode: 'all' | 'any';
}

export interface CosmeticItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  type: CosmeticType;
  rarity: CosmeticRarity;
  price: number;
  visualValue: string;
  artUrl: string | null;
  adjust: LookPiece['adjust'];
  layer: LookPiece['layer'];
  recolorable: boolean;
  festiveEvent: string | null;
  availableUntil: string | null;
  requiredAchievementSlug: string | null;
  requirementMet: boolean;
  owned: boolean;
  equipped: boolean;
  /** Cor escolhida (#rrggbb) em item recolorível ou no fundo personalizado. */
  color: string | null;
  affordable: boolean;
  unlock: UnlockState;
}

/** Peça de um kit à venda; só vira item da coleção depois da compra do kit. */
export interface CosmeticKitPiece {
  id: number;
  type: CosmeticType;
  name: string;
  visualValue: string;
  artUrl: string | null;
  adjust: LookPiece['adjust'];
  layer: LookPiece['layer'];
  recolorable: boolean;
}

export interface CosmeticKit {
  id: number;
  slug: string;
  name: string;
  description: string;
  rarity: CosmeticRarity;
  price: number;
  festiveEvent: string | null;
  availableUntil: string | null;
  owned: boolean;
  affordable: boolean;
  unlock: UnlockState;
  pieces: CosmeticKitPiece[];
}

/** Peça equipada: o suficiente para desenhar (mesmo formato do visual do ranking). */
export type EquippedCosmetic = LookPiece & { type: CosmeticType; slug: string };

export interface AchievementShop {
  prestigeBalance: number;
  equipped: EquippedCosmetic[];
  items: CosmeticItem[];
  kits: CosmeticKit[];
  /** Cor base do personagem (a escolhida ou a padrão); API antiga não envia. */
  character?: { color: CharacterColor; chosen: boolean };
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

export async function purchaseCosmeticKit(kitId: number): Promise<AchievementShop> {
  const response = await api.post(`/achievements/shop/kits/${kitId}/purchase`);
  return response.data as AchievementShop;
}

/** Equipa o item; `color` (#rrggbb) só vale para item recolorível ou fundo personalizado. */
export async function equipCosmetic(itemId: number, color?: string): Promise<AchievementShop> {
  const response = await api.post(`/achievements/shop/${itemId}/equip`, color ? { color } : undefined);
  return response.data as AchievementShop;
}

export async function unequipCosmetic(type: CosmeticType): Promise<AchievementShop> {
  const response = await api.post(`/achievements/shop/type/${type}/unequip`);
  return response.data as AchievementShop;
}

/** Escolhe a cor base do personagem (grátis e imediata); devolve o shop atualizado. */
export async function chooseCharacterColor(color: CharacterColor): Promise<AchievementShop> {
  const response = await api.post('/achievements/character/color', { color });
  return response.data as AchievementShop;
}
