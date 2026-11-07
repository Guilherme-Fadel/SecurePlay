import { RARITY_LABELS } from './albumModel';
import type {
  AchievementNode,
  AchievementRarity,
  AchievementShop,
  AchievementTrail,
  CosmeticItem,
  CosmeticType,
} from '@/services/achievements';

/**
 * Regras puras de Colecionáveis. O backend é a autoridade: o estado do item
 * vem de `owned`, `equipped`, `requirementMet` e `affordable`; aqui só se
 * traduz o que veio para a interface (nada de recalcular permissão).
 */

export const COSMETIC_TYPES: readonly CosmeticType[] = ['frame', 'background', 'title', 'badge', 'effect'];

export const typeLabel: Record<CosmeticType, string> = {
  frame: 'Borda',
  background: 'Fundo',
  title: 'Título',
  badge: 'Emblema',
  effect: 'Efeito',
};

export const typeTabLabel: Record<CosmeticType, string> = {
  frame: 'Bordas',
  background: 'Fundos',
  title: 'Títulos',
  badge: 'Emblemas',
  effect: 'Efeitos',
};

/** Mesmos rótulos do álbum (fonte única em albumModel). */
export const rarityLabel: Record<AchievementRarity, string> = RARITY_LABELS;

export type ItemState = 'buy' | 'save' | 'lock' | 'own' | 'equipped';

type ItemFlags = Pick<CosmeticItem, 'owned' | 'equipped' | 'requirementMet' | 'affordable'>;

/** Ordem de prioridade: equipado > seu > bloqueado > faltam chaves > comprar. */
export function itemState(item: ItemFlags): ItemState {
  if (item.equipped) return 'equipped';
  if (item.owned) return 'own';
  if (!item.requirementMet) return 'lock';
  if (!item.affordable) return 'save';
  return 'buy';
}

export function keysLabel(count: number): string {
  return `${count} ${count === 1 ? 'chave' : 'chaves'}`;
}

/** Quanto falta, só para exibir; `null` se o saldo recebido não explica a recusa. */
export function missingKeys(price: number, balance: number): number | null {
  const missing = price - balance;
  return missing > 0 ? missing : null;
}

export function missingLabel(price: number, balance: number): string {
  const missing = missingKeys(price, balance);
  return missing === null ? 'Chaves insuficientes' : `Faltam ${keysLabel(missing)}`;
}

/** Segmentos da barrinha de chaves (preço em blocos, os já cobertos acesos). */
export function keySegments(price: number, balance: number, max = 20): boolean[] {
  const total = Math.max(0, Math.min(price, max));
  const lit = Math.max(0, Math.min(balance, total));
  return Array.from({ length: total }, (_, index) => index < lit);
}

export interface TabCount {
  type: CosmeticType;
  label: string;
  count: number;
}

export function tabCounts(items: readonly CosmeticItem[]): TabCount[] {
  return COSMETIC_TYPES.map((type) => ({
    type,
    label: typeTabLabel[type],
    count: items.filter((item) => item.type === type).length,
  }));
}

/** Primeira aba com itens; sem catálogo, a primeira. */
export function initialTab(items: readonly CosmeticItem[]): CosmeticType {
  return COSMETIC_TYPES.find((type) => items.some((item) => item.type === type)) ?? COSMETIC_TYPES[0];
}

export function itemsOfType(items: readonly CosmeticItem[], type: CosmeticType): CosmeticItem[] {
  return items.filter((item) => item.type === type);
}

/** Índice da aba após uma tecla (setas circulares, Home/End); `null` se a tecla não navega. */
export function tabIndexAfterKey(key: string, current: number, total: number): number | null {
  if (total <= 0) return null;
  if (key === 'ArrowRight' || key === 'ArrowDown') return (current + 1) % total;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (current - 1 + total) % total;
  if (key === 'Home') return 0;
  if (key === 'End') return total - 1;
  return null;
}

export interface WornPiece {
  type: CosmeticType;
  slug: string;
  name: string;
  visualValue: string;
  /** A peça é a prévia do item selecionado, não o que está equipado. */
  preview: boolean;
}

export type Look = Record<CosmeticType, WornPiece | null>;

/** O que o provador mostra: o equipado (do backend) com a prévia por cima, no tipo dela. */
export function buildLook(shop: Pick<AchievementShop, 'equipped' | 'items'>, preview: CosmeticItem | null): Look {
  const look: Look = { frame: null, background: null, title: null, badge: null, effect: null };
  for (const piece of shop.equipped) {
    const item = shop.items.find((candidate) => candidate.slug === piece.slug);
    look[piece.type] = { type: piece.type, slug: piece.slug, name: item?.name ?? piece.visualValue, visualValue: piece.visualValue, preview: false };
  }
  if (preview) {
    look[preview.type] = { type: preview.type, slug: preview.slug, name: preview.name, visualValue: preview.visualValue, preview: true };
  }
  return look;
}

export interface RequirementInfo {
  name: string;
  hint: string | null;
  node: AchievementNode | null;
}

/** Texto do requisito a partir do slug do backend; sem a trilha, cai no slug legível. */
export function requirementInfo(item: Pick<CosmeticItem, 'requiredAchievementSlug'>, trail: Pick<AchievementTrail, 'nodes'> | null): RequirementInfo | null {
  const slug = item.requiredAchievementSlug;
  if (!slug) return null;
  const node = trail?.nodes.find((candidate) => candidate.slug === slug) ?? null;
  if (node) return { name: node.name, hint: node.description, node };
  // Sem a trilha (carregando/erro) não se mostra o slug: ele pode descrever uma conquista secreta.
  return { name: 'uma conquista do álbum', hint: null, node: null };
}

export interface NearAchievement {
  node: AchievementNode;
  reward: number;
  progressLabel: string;
}

/**
 * Conquistas que podem render chaves: liberadas (em progresso), não secretas
 * e com recompensa informada. Mais adiantadas primeiro.
 */
export function nearKeyAchievements(trail: Pick<AchievementTrail, 'nodes'> | null, limit = 3): { items: NearAchievement[]; total: number } {
  if (!trail) return { items: [], total: 0 };
  const candidates = trail.nodes
    .filter((node) => node.status === 'in_progress' && typeof node.rewardPrestige === 'number' && node.rewardPrestige > 0)
    .sort((a, b) => b.progressPercent - a.progressPercent || (b.rewardPrestige ?? 0) - (a.rewardPrestige ?? 0) || a.id - b.id);
  return {
    total: candidates.length,
    items: candidates.slice(0, Math.max(0, limit)).map((node) => ({
      node,
      reward: node.rewardPrestige ?? 0,
      progressLabel: node.target === null ? 'em andamento' : `${node.progress} de ${node.target}`,
    })),
  };
}

export function itemAriaLabel(item: CosmeticItem, balance: number, requirement: RequirementInfo | null): string {
  const state = itemState(item);
  const detail = state === 'equipped' ? 'equipado'
    : state === 'own' ? 'já é seu'
      : state === 'lock' ? `precisa da conquista ${requirement?.name ?? ''}`.trim()
        : state === 'save' ? `custa ${keysLabel(item.price)}, ${missingLabel(item.price, balance).toLowerCase()}`
          : `custa ${keysLabel(item.price)}`;
  return `${item.name}, ${typeLabel[item.type]}, ${detail}. Experimentar no provador`;
}

/** Mensagem do backend (Nest: `message` string ou lista) sem `any`. */
export function extractErrorMessage(error: unknown): string | undefined {
  const message = readField(readField(readField(error, 'response'), 'data'), 'message');
  const parts: unknown[] = Array.isArray(message) ? message : [message];
  return parts.find((part): part is string => typeof part === 'string' && part.trim().length > 0);
}

function readField(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  return Object.entries(value).find(([name]) => name === key)?.[1];
}
