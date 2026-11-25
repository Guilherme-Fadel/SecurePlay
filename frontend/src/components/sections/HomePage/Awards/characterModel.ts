import type { CSSProperties } from 'react';
import { isSafeArtUrl } from '@/components/shared/Character/characterLook';
import type {
  AchievementNode,
  AchievementShop,
  CosmeticItem,
  CosmeticKit,
  CosmeticType,
  UnlockCondition,
  UnlockState,
} from '@/services/achievements';
import type { CharacterLook, LookPiece } from '@/services/dashboard';
import { itemState, keysLabel, missingLabel, rarityLabel, typeLabel, type ItemState } from './collectiblesModel';

/**
 * Regras puras de Colecionáveis › Personagem. O backend é a autoridade (posse,
 * saldo, exigências e liberação); aqui só se agrupa, se traduz e se monta a
 * prévia. Nada aqui concede ou recusa acesso.
 */

export type CharacterSlot = 'skin' | 'head' | 'face' | 'neck' | 'effect' | 'background' | 'card';

export const CHARACTER_SLOTS: ReadonlyArray<{ slot: CharacterSlot; label: string }> = [
  { slot: 'skin', label: 'Skin' },
  { slot: 'head', label: 'Cabeça' },
  { slot: 'face', label: 'Rosto' },
  { slot: 'neck', label: 'Pescoço' },
  { slot: 'effect', label: 'Efeito' },
  { slot: 'background', label: 'Fundo' },
  { slot: 'card', label: 'Tema do card' },
];

export function isCharacterSlot(type: CosmeticType): type is CharacterSlot {
  return CHARACTER_SLOTS.some((entry) => entry.slot === type);
}

type ShopCatalog = Pick<AchievementShop, 'items' | 'kits'>;

/* ---------- Exigências ---------- */

export interface ConditionLine {
  label: string;
  progress: string;
  /** "Rótulo: progresso", para leitura corrida e testes. */
  text: string;
  met: boolean;
}

type NodeName = Pick<AchievementNode, 'slug' | 'name'>;

const formatNumber = (value: number) => value.toLocaleString('pt-BR');
const line = (label: string, progress: string, met: boolean): ConditionLine => ({ label, progress, text: `${label}: ${progress}`, met });

const NUMERIC_LABELS = {
  xp_season: ['XP na temporada', ''],
  xp_total: ['XP total', ''],
  access_days: ['Dias de acesso', ''],
  streak: ['Sequência de acesso', ' dias'],
} as const;

function rankLine(condition: UnlockCondition): ConditionLine {
  const top = Number(condition.target);
  const where = condition.scope === 'empresa' ? ' da escola' : condition.scope === 'global' ? ' geral' : ' da temporada';
  const label = `${top === 1 ? '1º lugar' : `Top ${top}`}${where}`;
  const position = Number(condition.current);
  return line(label, position > 0 ? `você está em ${position}º` : 'sem colocação ainda', condition.met);
}

/** Uma exigência em português. Sem a trilha, o nome da conquista não é revelado (pode ser secreta). */
export function conditionLine(condition: UnlockCondition, nodes: readonly NodeName[] = []): ConditionLine {
  switch (condition.metric) {
    case 'xp_season':
    case 'xp_total':
    case 'access_days':
    case 'streak': {
      const [label, unit] = NUMERIC_LABELS[condition.metric];
      const target = Number(condition.target);
      const current = Math.max(0, Number(condition.current));
      const shown = condition.met ? Math.min(current, target) : current;
      return line(label, `${formatNumber(shown)} de ${formatNumber(target)}${unit}`, condition.met);
    }
    case 'rank':
      return rankLine(condition);
    case 'achievement': {
      const node = nodes.find((candidate) => candidate.slug === condition.target);
      return line(node ? `Conquista ${node.name}` : 'Conquista do álbum', condition.met ? 'desbloqueada' : 'ainda bloqueada', condition.met);
    }
    default:
      return line(condition.label, condition.met ? 'cumprida' : 'faltando', condition.met);
  }
}

/**
 * Rótulo curto do que falta numa peça bloqueada: a primeira exigência não cumprida (XP, sequência,
 * colocação, conquista...). Sem a trilha, a conquista fica anônima (pode ser secreta).
 */
export function lockLabel(unlock: Pick<UnlockState, 'conditions' | 'mode'> | undefined, nodes: readonly NodeName[] = []): string {
  const missing = (unlock?.conditions ?? []).filter((condition) => !condition.met);
  if (missing.length === 0) return 'Exigência';
  const label = conditionLine(missing[0], nodes).label;
  if (missing.length === 1) return label;
  return unlock?.mode === 'any' ? `${label} ou outra` : `${label} +${missing.length - 1}`;
}

export interface UnlockSections {
  /** "Cumpra todas" ou "Cumpra qualquer uma"; só com mais de uma exigência no grupo principal. */
  modeLabel: string | null;
  main: ConditionLine[];
  /** Conquista legada do item no modo "qualquer uma": sempre obrigatória, mostrada à parte ("e também"). */
  alsoRequired: ConditionLine[];
}

export function unlockSections(unlock: UnlockState, trail: { nodes: readonly NodeName[] } | null): UnlockSections {
  const entries = unlock.conditions.map((condition) => ({ required: condition.required === true, line: conditionLine(condition, trail?.nodes ?? []) }));
  const apart = unlock.mode === 'any';
  const main = entries.filter((entry) => !(apart && entry.required)).map((entry) => entry.line);
  const alsoRequired = entries.filter((entry) => apart && entry.required).map((entry) => entry.line);
  const modeLabel = main.length < 2 ? null : unlock.mode === 'any' ? 'Cumpra qualquer uma' : 'Cumpra todas';
  return { modeLabel, main, alsoRequired };
}

/* ---------- Coleção e loja por encaixe ---------- */

export interface SlotGroups {
  collection: CosmeticItem[];
  forSale: CosmeticItem[];
}

/** Peças de kits cujo item ainda não é do aluno: só entram pela compra do kit. */
function unownedKitPieceIds(kits: readonly CosmeticKit[], items: readonly CosmeticItem[]): Set<number> {
  const ownedIds = new Set(items.filter((item) => item.owned).map((item) => item.id));
  return new Set(kits.flatMap((kit) => kit.pieces.map((piece) => piece.id)).filter((id) => !ownedIds.has(id)));
}

/** Coleção (equipado primeiro) e à venda de um encaixe, sem peças de kit não compradas. */
export function slotGroups(shop: ShopCatalog, slot: CharacterSlot): SlotGroups {
  const hidden = unownedKitPieceIds(shop.kits, shop.items);
  const inSlot = shop.items.filter((item) => item.type === slot && !hidden.has(item.id));
  const collection = inSlot.filter((item) => item.owned).sort((a, b) => Number(b.equipped) - Number(a.equipped));
  return { collection, forSale: inSlot.filter((item) => !item.owned) };
}

export interface SlotCount {
  slot: CharacterSlot;
  label: string;
  count: number;
}

export function slotCounts(shop: ShopCatalog): SlotCount[] {
  return CHARACTER_SLOTS.map(({ slot, label }) => {
    const groups = slotGroups(shop, slot);
    return { slot, label, count: groups.collection.length + groups.forSale.length };
  });
}

export function characterItemLabel(item: CosmeticItem, balance: number): string {
  const state = itemState(item);
  const detail = state === 'equipped' ? 'equipado'
    : state === 'own' ? 'já é seu'
      : state === 'lock' ? 'bloqueado, veja as exigências'
        : state === 'save' ? `custa ${keysLabel(item.price)}, ${missingLabel(item.price, balance).toLowerCase()}`
          : `custa ${keysLabel(item.price)}`;
  return `${item.name}, ${typeLabel[item.type]}, ${rarityLabel[item.rarity]}, ${detail}. Experimentar na prévia`;
}

/** Evento e prazo de um comemorativo (data de Brasília); `null` se o backend não mandou evento. */
export function festiveLabel(entry: { festiveEvent: string | null; availableUntil: string | null }): string | null {
  if (!entry.festiveEvent) return null;
  const until = entry.availableUntil ? new Date(entry.availableUntil) : null;
  if (!until || Number.isNaN(until.getTime())) return entry.festiveEvent;
  return `${entry.festiveEvent} · até ${until.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
}

export type KitState = Exclude<ItemState, 'equipped'>;

export function kitState(kit: Pick<CosmeticKit, 'owned' | 'affordable' | 'unlock'>): KitState {
  const state = itemState({ owned: kit.owned, equipped: false, requirementMet: kit.unlock.met, affordable: kit.affordable });
  return state === 'equipped' ? 'own' : state;
}

/* ---------- Prévia ---------- */

function equippedPiece(piece: AchievementShop['equipped'][number]): LookPiece {
  return { visualValue: piece.visualValue, artUrl: piece.artUrl, color: piece.color, adjust: piece.adjust, layer: piece.layer };
}

/** Item não equipado: o backend já envia a arte, o ajuste e a camada dele. */
function trialPiece(item: CosmeticItem): LookPiece {
  return { visualValue: item.visualValue, artUrl: item.artUrl, color: item.color, adjust: item.adjust, layer: item.layer };
}

/** O que está equipado, com o item em prova no lugar do seu encaixe (e só dele). */
export function buildCharacterLook(shop: Pick<AchievementShop, 'equipped'>, trying: CosmeticItem | null): CharacterLook {
  const look: CharacterLook = {};
  for (const piece of shop.equipped) {
    if (isCharacterSlot(piece.type)) look[piece.type] = equippedPiece(piece);
  }
  if (trying && isCharacterSlot(trying.type)) {
    const worn = shop.equipped.find((piece) => piece.type === trying.type && piece.slug === trying.slug);
    look[trying.type] = worn ? equippedPiece(worn) : trialPiece(trying);
  }
  return look;
}

/* ---------- Fundo do palco e tema do card ---------- */

export interface ThemeView {
  className: string;
  style: (Pick<CSSProperties, 'backgroundColor' | 'backgroundImage'> & { '--card-frame'?: string }) | undefined;
}

export const STAGE_THEMES: readonly string[] = ['palco', 'por-do-sol', 'noite', 'confete', 'xadrez', 'custom'];
export const CARD_THEMES: readonly string[] = ['classico', 'ouro', 'noite', 'rosa', 'azul'];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const LEGACY_BACKGROUND = /^background-[a-z0-9-]+$/;
// A URL entra em `url("...")`: nada que feche aspas ou parênteses.
const CSS_URL_SAFE = /^[^"'()\\\s]+$/;

/** `url("...")` da arte enviada, ou `null` se a URL não for segura. */
function artCssUrl(piece: LookPiece | undefined): string | null {
  const url = piece?.artUrl;
  if (!isSafeArtUrl(url) || !CSS_URL_SAFE.test(url)) return null;
  return `url("${url}")`;
}

/** Fundo do palco: arte enviada, fundo antigo do catálogo, tema conhecido ou o palco padrão. */
export function stageTheme(piece: LookPiece | undefined): ThemeView {
  const art = artCssUrl(piece);
  if (art) return { className: 'chr-art', style: { backgroundImage: art } };
  const value = piece?.visualValue ?? '';
  if (LEGACY_BACKGROUND.test(value)) return { className: `cosmetic-background-host ${value}`, style: undefined };
  if (!STAGE_THEMES.includes(value)) return { className: 'chr-bg--palco', style: undefined };
  const color = value === 'custom' && piece?.color && HEX_COLOR.test(piece.color) ? piece.color : null;
  return { className: `chr-bg--${value}`, style: color ? { backgroundColor: color } : undefined };
}

/** Tema do card: a arte enviada é uma moldura 9 partes (`border-image`) sobre o fundo escuro, nunca `cover`. */
export function cardTheme(piece: LookPiece | undefined): ThemeView {
  const art = artCssUrl(piece);
  if (art) return { className: 'chr-art chr-card-frame', style: { '--card-frame': art } };
  const value = piece?.visualValue ?? '';
  return { className: `chr-card--${CARD_THEMES.includes(value) ? value : 'classico'}`, style: undefined };
}

/* ---------- Cor ---------- */

/** Cores sugeridas, espelho dos tokens `--sp-*` (o backend exige #rrggbb, não o nome do token). */
export const COLOR_CHOICES: ReadonlyArray<{ name: string; hex: string; token: string }> = [
  { name: 'Vermelho', hex: '#F51300', token: '--sp-red' },
  { name: 'Azul', hex: '#2662E7', token: '--sp-blue' },
  { name: 'Laranja', hex: '#FF7101', token: '--sp-orange' },
  { name: 'Rosa', hex: '#FE96C7', token: '--sp-pink' },
  { name: 'Amarelo', hex: '#FED501', token: '--sp-yellow' },
  { name: 'Grafite', hex: '#1C1C21', token: '--sp-ink-800' },
];

/** Só peça recolorível ou o fundo "do seu jeito" aceitam cor (mesma regra do backend). */
export function acceptsColor(item: Pick<CosmeticItem, 'type' | 'recolorable' | 'visualValue'>): boolean {
  return item.recolorable || (item.type === 'background' && item.visualValue === 'custom');
}

export function sameColor(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}
