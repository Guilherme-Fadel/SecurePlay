import { RARITY_LABELS } from './albumModel';
import type { AchievementNode, AchievementTrail, CosmeticItem, CosmeticRarity, CosmeticType } from '@/services/achievements';

/**
 * Regras puras de Colecionáveis. O backend é a autoridade: o estado do item
 * vem de `owned`, `equipped`, `requirementMet` e `affordable`; aqui só se
 * traduz o que veio para a interface (nada de recalcular permissão).
 */

export const typeLabel: Record<CosmeticType, string> = {
  background: 'Fundo',
  effect: 'Efeito',
  skin: 'Skin',
  head: 'Cabeça',
  face: 'Rosto',
  neck: 'Pescoço',
  card: 'Tema do card',
};

/** Mesmos rótulos do álbum (fonte única em albumModel). */
export const rarityLabel: Record<CosmeticRarity, string> = { ...RARITY_LABELS, festive: 'Comemorativa' };

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

/** Índice da aba após uma tecla (setas circulares, Home/End); `null` se a tecla não navega. */
export function tabIndexAfterKey(key: string, current: number, total: number): number | null {
  if (total <= 0) return null;
  if (key === 'ArrowRight' || key === 'ArrowDown') return (current + 1) % total;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (current - 1 + total) % total;
  if (key === 'Home') return 0;
  if (key === 'End') return total - 1;
  return null;
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

/** Nível exibido: o da trilha (backend) ou, sem ela, o do usuário atual. */
export function profileLevel(trail: Pick<AchievementTrail, 'summary'> | null, user: { level?: number | null } | null): number | null {
  return trail?.summary.level ?? user?.level ?? null;
}
