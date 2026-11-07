import type { AchievementNode, AchievementRarity } from '@/services/achievements';

/**
 * Modelo puro do álbum (Conquistas › Álbum). Só organiza o que o backend
 * envia: status, progresso, meta, recompensa e mascaramento das secretas vêm
 * prontos de `GET /achievements` e não são recalculados aqui.
 */

export type StickerState = 'stuck' | 'next' | 'locked' | 'secret';
export type StickerFilter = 'all' | 'stuck' | 'next' | 'locked';
export type AlbumSection = 'dashboard' | 'conteudos' | 'desafios';

export interface AlbumSticker {
  node: AchievementNode;
  /** Número no álbum inteiro, na ordem enviada pelo backend (1 = #01). */
  number: number;
  state: StickerState;
  /** Nome da coleção (categoria) a que pertence. */
  collectionLabel: string;
  /** Percentual do backend; 0 nas secretas mascaradas. */
  percent: number;
  /** Quanto falta para a meta, ou null quando a meta não é enviada. */
  remaining: number | null;
}

export interface AlbumCollection {
  category: string;
  label: string;
  subtitle: string;
  stickers: AlbumSticker[];
  stuck: number;
  total: number;
  complete: boolean;
  /** Primeira figurinha ainda não colada da coleção. */
  next: AlbumSticker | null;
}

export interface Album {
  collections: AlbumCollection[];
  stickers: AlbumSticker[];
  stuck: number;
  total: number;
}

export interface AlbumDestination {
  section: AlbumSection;
  label: string;
}

/** Recursos disponíveis para o aluno; o backend continua sendo a autoridade. */
export interface AlbumFeatures {
  /** A empresa tem ao menos um jogo habilitado. */
  games: boolean;
  /** O Início mostra a missão do dia (que também faz o check-in) a este usuário. */
  dailyMission: boolean;
}

const COLLECTION_META: Record<string, { label: string; subtitle: string }> = {
  sentinel: { label: 'Sentinela', subtitle: 'Missões do dia' },
  specialist: { label: 'Especialista', subtitle: 'Aulas' },
  investigator: { label: 'Investigador', subtitle: 'Jogos' },
  consistency: { label: 'Consistência', subtitle: 'Sequência de dias' },
  elite: { label: 'Elite', subtitle: 'Níveis e XP' },
};

export const RARITY_LABELS: Record<AchievementRarity, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Rara',
  epic: 'Épica',
  legendary: 'Lendária',
};

export const FILTERS: ReadonlyArray<{ value: StickerFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'stuck', label: 'Coladas' },
  { value: 'next', label: 'Próximas' },
  { value: 'locked', label: 'Bloqueadas' },
];

const STATE_LABELS: Record<StickerState, string> = {
  stuck: 'colada',
  next: 'próxima',
  locked: 'bloqueada',
  secret: 'segredo',
};

/** Secreta ainda não desbloqueada: o backend já mandou nome, descrição e arte mascarados. */
export function isConcealed(node: AchievementNode): boolean {
  return node.secret && node.status !== 'unlocked';
}

export function stickerState(node: AchievementNode): StickerState {
  if (node.status === 'unlocked') return 'stuck';
  if (isConcealed(node)) return 'secret';
  return node.status === 'in_progress' ? 'next' : 'locked';
}

export function collectionMeta(category: string): { label: string; subtitle: string } {
  return COLLECTION_META[category] ?? { label: category.charAt(0).toUpperCase() + category.slice(1), subtitle: 'Coleção' };
}

export function stickerNumber(number: number): string {
  return `#${String(number).padStart(2, '0')}`;
}

function percentOf(node: AchievementNode): number {
  const value = Number.isFinite(node.progressPercent) ? node.progressPercent : 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Agrupa as conquistas em coleções (uma por categoria), na ordem em que o
 * backend envia (`order_index`, depois nível). Aguenta coleções e categorias
 * novas sem mudar a interface.
 */
export function buildAlbum(nodes: readonly AchievementNode[]): Album {
  const groups = new Map<string, AchievementNode[]>();
  for (const node of nodes) {
    const list = groups.get(node.category);
    if (list) list.push(node);
    else groups.set(node.category, [node]);
  }

  let counter = 0;
  const collections: AlbumCollection[] = [];
  for (const [category, members] of groups) {
    const ordered = members
      .map((node, index) => ({ node, index }))
      .sort((a, b) => a.node.tier - b.node.tier || a.index - b.index)
      .map(({ node }) => node);
    const meta = collectionMeta(category);
    const stickers = ordered.map((node): AlbumSticker => {
      counter += 1;
      const state = stickerState(node);
      return {
        node,
        number: counter,
        collectionLabel: meta.label,
        state,
        percent: state === 'stuck' ? 100 : percentOf(node),
        remaining: node.target === null ? null : Math.max(0, node.target - node.progress),
      };
    });
    const stuck = stickers.filter((sticker) => sticker.state === 'stuck').length;
    collections.push({
      category,
      label: meta.label,
      subtitle: meta.subtitle,
      stickers,
      stuck,
      total: stickers.length,
      complete: stickers.length > 0 && stuck === stickers.length,
      next: stickers.find((sticker) => sticker.state === 'next') ?? stickers.find((sticker) => sticker.state !== 'stuck') ?? null,
    });
  }

  const stickers = collections.flatMap((collection) => collection.stickers);
  return {
    collections,
    stickers,
    stuck: stickers.filter((sticker) => sticker.state === 'stuck').length,
    total: stickers.length,
  };
}

/** "Quase lá!": próximas com meta conhecida, da maior porcentagem para a menor. */
export function almostThere(album: Album): AlbumSticker[] {
  return album.stickers
    .filter((sticker) => sticker.state === 'next' && sticker.remaining !== null)
    .sort((a, b) => b.percent - a.percent
      || (a.remaining ?? 0) - (b.remaining ?? 0)
      || a.number - b.number);
}

/** Bloqueadas incluem as secretas: o filtro não separa o que o backend mascara. */
export function matchesFilter(sticker: AlbumSticker, filter: StickerFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'locked') return sticker.state === 'locked' || sticker.state === 'secret';
  return sticker.state === filter;
}

export function filterStickers(stickers: readonly AlbumSticker[], filter: StickerFilter): AlbumSticker[] {
  return stickers.filter((sticker) => matchesFilter(sticker, filter));
}

export function filterCounts(stickers: readonly AlbumSticker[]): Record<StickerFilter, number> {
  return {
    all: stickers.length,
    stuck: filterStickers(stickers, 'stuck').length,
    next: filterStickers(stickers, 'next').length,
    locked: filterStickers(stickers, 'locked').length,
  };
}

/**
 * D17: o botão leva à tela que realmente conta o progresso da coleção
 * (`backend/src/achievements/achievement-metrics.ts` e seed do catálogo):
 * - sentinel → `challenges_completed` (missão do dia, no Início);
 * - consistency → `streak` (check-in feito junto da missão do dia, no Início);
 * - specialist → `lessons_completed` (Aprender);
 * - investigator → `arcade_plays`/`perfect_arcade_runs` (Jogos, se a empresa tiver jogos);
 * - elite → `level`/`total_xp`; o XP vem de aulas, missões, check-in e jogos,
 *   e Aprender é a fonte principal de estudo.
 * Sem a seção disponível, não há botão.
 */
export function destinationFor(category: string, features: AlbumFeatures): AlbumDestination | null {
  switch (category) {
    case 'sentinel':
      return features.dailyMission ? { section: 'dashboard', label: 'Ir para a missão do dia' } : null;
    case 'consistency':
      return features.dailyMission ? { section: 'dashboard', label: 'Fazer o check-in no Início' } : null;
    case 'specialist':
      return { section: 'conteudos', label: 'Ir para Aprender' };
    case 'investigator':
      return features.games ? { section: 'desafios', label: 'Ir para Jogos' } : null;
    case 'elite':
      return { section: 'conteudos', label: 'Ganhar XP em Aprender' };
    default:
      return null;
  }
}

/** Só figurinhas próximas ganham botão de destino, como no canvas. */
export function stickerDestination(sticker: AlbumSticker, features: AlbumFeatures): AlbumDestination | null {
  return sticker.state === 'next' ? destinationFor(sticker.node.category, features) : null;
}

export function remainingText(remaining: number | null): string {
  if (remaining === null) return '';
  return remaining === 1 ? 'falta 1' : `faltam ${remaining}`;
}

export function progressText(sticker: AlbumSticker): string {
  const { node } = sticker;
  if (sticker.state === 'secret' || node.target === null) return '';
  return `${node.progress} de ${node.target}`;
}

export function keysText(amount: number): string {
  return `${amount} ${amount === 1 ? 'Chave Digital' : 'Chaves Digitais'}`;
}

export function rewardText(sticker: AlbumSticker): string {
  const reward = sticker.node.rewardPrestige;
  if (reward === null) return 'Recompensa secreta';
  return `${sticker.state === 'stuck' ? 'Você ganhou' : 'Vale'} ${keysText(reward)}`;
}

function formatDay(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Linha de estado do detalhe. Na secreta, um rótulo fixo (a descrição mascarada já aparece acima). */
export function statusText(sticker: AlbumSticker, album: Album): string {
  const { node } = sticker;
  switch (sticker.state) {
    case 'stuck': {
      const day = node.unlockedAt ? formatDay(node.unlockedAt) : null;
      return day ? `Colada em ${day}` : 'Colada';
    }
    case 'next': {
      const left = remainingText(sticker.remaining);
      return left ? `${left.charAt(0).toUpperCase()}${left.slice(1)} para colar` : 'Continue avançando para colar';
    }
    case 'locked': {
      const previous = node.prerequisiteSlug
        ? album.stickers.find((item) => item.node.slug === node.prerequisiteSlug)
        : undefined;
      return previous ? `Cole antes a ${stickerNumber(previous.number)} · ${previous.node.name}` : 'Ainda bloqueada';
    }
    case 'secret':
      return 'Figurinha secreta';
  }
}

/** Classe CSS do estado da figurinha. */
export function stickerStateClass(sticker: AlbumSticker): string {
  return `is-${sticker.state}`;
}

/** Nome curto no espaço da figurinha: a secreta mostra só "Segredo". */
export function stickerLabel(sticker: AlbumSticker): string {
  return sticker.state === 'secret' ? 'Segredo' : sticker.node.name;
}

export function stickerAria(sticker: AlbumSticker): string {
  const progress = progressText(sticker);
  return `${stickerNumber(sticker.number)} ${sticker.node.name}, ${STATE_LABELS[sticker.state]}${progress ? `, ${progress}` : ''}`;
}

export function collectionRange(collection: AlbumCollection): string {
  const first = collection.stickers[0];
  const last = collection.stickers[collection.stickers.length - 1];
  if (!first || !last) return '';
  return first === last ? stickerNumber(first.number) : `${stickerNumber(first.number)}–${stickerNumber(last.number)}`;
}

export function collectionNextText(collection: AlbumCollection): string {
  const next = collection.next;
  if (!next) return 'Coleção completa';
  if (next.state === 'secret') return 'Figurinha secreta';
  const left = next.state === 'next' ? remainingText(next.remaining) : '';
  return left ? `${next.node.name} · ${left}` : next.node.name;
}

export type FanItem = { sticker: AlbumSticker; kind: 'stuck' | 'ghost' | 'silhouette' };

/** Leque da capa: as últimas coladas (até 3) e a próxima; sem nenhuma, a 1ª em silhueta. */
export function collectionFan(collection: AlbumCollection): FanItem[] {
  const fan: FanItem[] = collection.stickers
    .filter((sticker) => sticker.state === 'stuck')
    .slice(-3)
    .map((sticker) => ({ sticker, kind: 'stuck' }));
  const next = collection.stickers.find((sticker) => sticker.state === 'next');
  if (next) fan.push({ sticker: next, kind: 'ghost' });
  if (fan.length === 0) {
    const first = collection.stickers.find((sticker) => sticker.state !== 'secret');
    if (first) fan.push({ sticker: first, kind: 'silhouette' });
  }
  return fan;
}
