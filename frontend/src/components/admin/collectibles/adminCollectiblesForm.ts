import type { CosmeticRarity, CosmeticType } from '@/services/achievements';
import { LEGACY_MESSAGE, isLegacyType, savableType } from './legacyTypes';
import type { CharacterLook, LookPiece } from '@/services/dashboard';
import type {
  CollectibleItem, CollectibleItemInput, CollectibleKit, CollectibleKitInput, CollectibleKitPieceInput,
  CollectibleItemType, CollectibleLayer, CollectibleSlotType, UnlockCondition, UnlockRule,
} from '@/services/adminCollectibles';

/**
 * Estado, montagem do corpo e validação do formulário de colecionáveis. Texto digitado fica como texto
 * até virar corpo; o backend é a autoridade e valida tudo de novo (a validação aqui só poupa a ida e volta).
 */

export const MAX_REQUIREMENTS = 6;
export const SLOT_TYPES: readonly CollectibleSlotType[] = ['skin', 'head', 'face', 'neck', 'effect'];
/** Fundo do palco e tema do card: escolhem um tema da biblioteca (`visualValue`) ou usam a arte enviada. */
export const THEME_TYPES: readonly CosmeticType[] = ['background', 'card'];
/** Encaixes do item avulso: os do personagem mais fundo e tema do card (kits só aceitam os do personagem). */
export const ITEM_TYPES: readonly CosmeticType[] = [...SLOT_TYPES, ...THEME_TYPES];
/** Escala do ajuste fino: a mesma faixa do backend (`CollectibleAdjustDto`). */
export const ADJUST_SCALE = { min: 0.1, max: 5, step: 0.05 } as const;
export const RARITIES: readonly CosmeticRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'festive'];

export type RequirementMetric = 'xp_season' | 'xp_total' | 'rank' | 'access_days' | 'streak' | 'achievement';
export type RankScope = 'empresa' | 'global';
export interface RequirementDraft { id: number; metric: RequirementMetric; value: string; scope: RankScope; slug: string }
export interface RuleDraft { mode: 'all' | 'any'; requirements: RequirementDraft[] }
export interface AdjustDraft { x: string; y: string; scale: string }
export type FormErrors = Record<string, string>;

export interface CommonForm {
  name: string;
  slug: string;
  /** Verdadeiro quando o slug foi digitado ou já existia: deixa de acompanhar o nome. */
  slugEdited: boolean;
  description: string;
  rarity: CosmeticRarity;
  price: string;
  festiveEvent: string;
  availableFrom: string;
  availableUntil: string;
  rule: RuleDraft;
}

export interface ItemForm extends CommonForm {
  type: CollectibleItemType;
  visualValue: string;
  /** Exigência antiga (conquista) do item: só leitura aqui, ainda vale na compra. */
  requiredAchievementSlug: string | null;
  artKey: string | null;
  artUrl: string | null;
  layer: CollectibleLayer;
  recolorable: boolean;
  adjust: AdjustDraft;
}

export interface PieceDraft {
  type: CollectibleSlotType;
  on: boolean;
  /** Peça já salva no kit; ausente em peça nova. */
  id?: number;
  name: string;
  /** Valor da biblioteca da peça salva: só alimenta a prévia (o corpo do kit não o envia). */
  visualValue: string;
  artKey: string | null;
  artUrl: string | null;
  layer: CollectibleLayer;
  recolorable: boolean;
  adjust: AdjustDraft;
}

export interface KitForm extends CommonForm { pieces: PieceDraft[] }

const DEFAULT_ADJUST: AdjustDraft = { x: '0', y: '0', scale: '1' };
const emptyRule = (): RuleDraft => ({ mode: 'all', requirements: [] });

const commonDefaults = (): CommonForm => ({
  name: '', slug: '', slugEdited: false, description: '', rarity: 'common', price: '0',
  festiveEvent: '', availableFrom: '', availableUntil: '', rule: emptyRule(),
});

export const emptyItemForm = (): ItemForm => ({
  ...commonDefaults(), type: 'head', visualValue: '', requiredAchievementSlug: null, artKey: null, artUrl: null, layer: 'front', recolorable: false, adjust: { ...DEFAULT_ADJUST },
});

const emptyPiece = (type: CollectibleSlotType): PieceDraft => ({
  type, on: false, name: '', visualValue: '', artKey: null, artUrl: null, layer: 'front', recolorable: false, adjust: { ...DEFAULT_ADJUST },
});

export const emptyKitForm = (): KitForm => ({ ...commonDefaults(), pieces: SLOT_TYPES.map(emptyPiece) });

const stripAccents = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '');

/** Slug sugerido a partir do nome: sem acento, minúsculo e hifenizado, até `max` caracteres. */
export function slugify(name: string, max = 80): string {
  return stripAccents(name).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/g, '');
}

/** Ao alternar Item avulso e Kit na criação, os campos comuns acompanham; o restante fica de cada tipo. */
export function carryCommon<T extends CommonForm>(from: CommonForm, to: T): T {
  const { name, slug, slugEdited, description, rarity, price, festiveEvent, availableFrom, availableUntil, rule } = from;
  return { ...to, name, slug, slugEdited, description, rarity, price, festiveEvent, availableFrom, availableUntil, rule };
}

/** Slug enquanto se digita: minúsculo, sem acento e só letras, números e hífens; hífen nas pontas fica (o próximo caractere vem depois). */
export function typeSlug(text: string, max = 80): string {
  return stripAccents(text).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-').slice(0, max);
}

/** Ao sair do campo: tira os hífens das pontas. */
export const finishSlug = (text: string): string => text.replace(/^-+|-+$/g, '');

/** Trocar o encaixe: só Efeito escolhe camada (os demais voltam para "na frente") e o tema escolhido não passa para outro encaixe. */
export function changeItemType(form: ItemForm, type: CosmeticType): ItemForm {
  return { ...form, type, layer: type === 'effect' ? form.layer : 'front', visualValue: type === form.type ? form.visualValue : '' };
}

export function newRequirement(id: number): RequirementDraft {
  return { id, metric: 'xp_season', value: '', scope: 'empresa', slug: '' };
}

const WHOLE = /^\d+$/;
const whole = (text: string): number => (WHOLE.test(text.trim()) ? Number(text.trim()) : Number.NaN);
const REQUIREMENT_CAP: Record<Exclude<RequirementMetric, 'achievement'>, number> = {
  xp_season: 1_000_000, xp_total: 1_000_000, access_days: 3650, streak: 3650, rank: 1000,
};

function toCondition(entry: RequirementDraft): UnlockCondition {
  if (entry.metric === 'achievement') return { metric: 'achievement', slug: entry.slug };
  if (entry.metric === 'rank') return { metric: 'rank', top: whole(entry.value), scope: entry.scope };
  return { metric: entry.metric, min: whole(entry.value) };
}

/** Sem exigências o corpo leva `null` (qualquer aluno pode adquirir). */
export function buildUnlockRule(rule: RuleDraft): UnlockRule | null {
  return rule.requirements.length === 0 ? null : { mode: rule.mode, conditions: rule.requirements.map(toCondition) };
}

export function ruleDraftFromRule(rule: UnlockRule | null): RuleDraft {
  if (!rule) return emptyRule();
  return {
    mode: rule.mode,
    requirements: rule.conditions.map((condition, index): RequirementDraft => {
      const base = newRequirement(index + 1);
      if (condition.metric === 'achievement') return { ...base, metric: 'achievement', slug: condition.slug };
      if (condition.metric === 'rank') return { ...base, metric: 'rank', value: String(condition.top), scope: condition.scope };
      return { ...base, metric: condition.metric, value: String(condition.min) };
    }),
  };
}

const plural = (count: number, one: string, many: string) => `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`;

function requirementText(entry: RequirementDraft): string {
  const count = whole(entry.value);
  switch (entry.metric) {
    case 'xp_season': return `${count.toLocaleString('pt-BR')} XP na temporada`;
    case 'xp_total': return `${count.toLocaleString('pt-BR')} XP no total`;
    case 'access_days': return plural(count, 'dia de acesso', 'dias de acesso');
    case 'streak': return plural(count, 'dia seguido de acesso', 'dias seguidos de acesso');
    case 'rank': return `top ${count} da temporada ${entry.scope === 'global' ? 'no ranking geral' : 'na escola'}`;
    default: return `a conquista ${entry.slug}`;
  }
}

/** "Libera com 100 XP na temporada e 5 dias seguidos de acesso." Só para o administrador conferir. */
export function ruleSummary(rule: RuleDraft): string {
  if (rule.requirements.length === 0) return 'Sem exigências: qualquer aluno pode adquirir.';
  const complete = rule.requirements.every((entry) => entry.metric === 'achievement' || Number.isFinite(whole(entry.value)));
  if (!complete) return 'Preencha o valor das exigências para ver o resumo.';
  return `Libera com ${rule.requirements.map(requirementText).join(rule.mode === 'all' ? ' e ' : ' ou ')}.`;
}

/** Ajuste do que está digitado; campo vazio ou inválido vale o padrão (a prévia nunca quebra). */
export function parseAdjust(adjust: AdjustDraft): { x: number; y: number; scale: number } {
  const read = (text: string, fallback: number) => (text.trim() !== '' && Number.isFinite(Number(text)) ? Number(text) : fallback);
  return { x: read(adjust.x, 0), y: read(adjust.y, 0), scale: read(adjust.scale, 1) };
}

const isDay = (text: string) => /^\d{4}-\d{2}-\d{2}$/.test(text);

/** Dia de Brasília (UTC-3, sem horário de verão) de um instante ISO do backend, em `YYYY-MM-DD`. */
function brasiliaDay(iso: string | null): string {
  const time = iso ? new Date(iso).getTime() : Number.NaN;
  return Number.isNaN(time) ? '' : new Date(time - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const adjustDraft = (adjust: { x: number; y: number; scale: number }): AdjustDraft => ({ x: String(adjust.x), y: String(adjust.y), scale: String(adjust.scale) });

function commonFromRecord(record: CollectibleItem | CollectibleKit): CommonForm {
  return {
    name: record.name, slug: record.slug, slugEdited: true, description: record.description, rarity: record.rarity, price: String(record.price),
    festiveEvent: record.festiveEvent ?? '', availableFrom: brasiliaDay(record.availableFrom), availableUntil: brasiliaDay(record.availableUntil),
    rule: ruleDraftFromRule(record.unlockRule),
  };
}

export function itemFormFromRecord(item: CollectibleItem): ItemForm {
  return {
    ...commonFromRecord(item), type: item.type, visualValue: item.visualValue, requiredAchievementSlug: item.requiredAchievementSlug ?? null, artKey: item.artKey, artUrl: item.artUrl,
    layer: item.layer, recolorable: item.recolorable, adjust: adjustDraft(item.adjust),
  };
}

export function kitFormFromRecord(kit: CollectibleKit): KitForm {
  const pieces = SLOT_TYPES.map((type): PieceDraft => {
    const saved = kit.pieces.find((piece) => piece.type === type);
    if (!saved) return emptyPiece(type);
    return { type, on: true, id: saved.id, name: saved.name, visualValue: saved.visualValue, artKey: saved.artKey, artUrl: saved.artUrl, layer: saved.layer, recolorable: saved.recolorable, adjust: adjustDraft(saved.adjust) };
  });
  return { ...commonFromRecord(kit), pieces };
}

function commonBody(form: CommonForm) {
  const festive = form.rarity === 'festive';
  return {
    name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim(), rarity: form.rarity, price: whole(form.price),
    unlockRule: buildUnlockRule(form.rule),
    festiveEvent: festive ? form.festiveEvent.trim() : null,
    availableFrom: festive ? form.availableFrom || null : null,
    availableUntil: festive ? form.availableUntil || null : null,
  };
}

export function buildItemBody(form: ItemForm): CollectibleItemInput {
  return { ...commonBody(form), type: savableType(form.type, ITEM_TYPES), visualValue: form.visualValue, artKey: form.artKey, layer: form.layer, recolorable: form.recolorable, adjust: parseAdjust(form.adjust) };
}

function pieceBody(piece: PieceDraft): CollectibleKitPieceInput {
  const body: CollectibleKitPieceInput = {
    type: piece.type, name: piece.name.trim(), artKey: piece.artKey, layer: piece.layer, recolorable: piece.recolorable, adjust: parseAdjust(piece.adjust),
  };
  return piece.id === undefined ? body : { id: piece.id, ...body };
}

/** Peças desmarcadas ficam fora do corpo: o backend as tira do kit (quem já tem a peça continua com ela). */
export function buildKitBody(form: KitForm): CollectibleKitInput {
  return { ...commonBody(form), pieces: form.pieces.filter((piece) => piece.on).map(pieceBody) };
}

function adjustError(adjust: AdjustDraft): string | undefined {
  const inRange = (text: string, min: number, max: number) => text.trim() !== '' && Number.isFinite(Number(text)) && Number(text) >= min && Number(text) <= max;
  if (!inRange(adjust.x, -500, 500) || !inRange(adjust.y, -500, 500)) return 'Posição horizontal e vertical devem ser números de -500 a 500.';
  const { min, max } = ADJUST_SCALE;
  return inRange(adjust.scale, min, max) ? undefined : `A escala deve ficar entre ${min.toLocaleString('pt-BR')} e ${max.toLocaleString('pt-BR')}.`;
}

function requirementError(entry: RequirementDraft): string | undefined {
  if (entry.metric === 'achievement') return undefined;
  const value = whole(entry.value);
  if (!Number.isInteger(value) || value < 1) return 'Informe um número inteiro de 1 em diante.';
  const cap = REQUIREMENT_CAP[entry.metric];
  return value > cap ? `O valor máximo é ${cap.toLocaleString('pt-BR')}.` : undefined;
}

function scheduleErrors(form: CommonForm, errors: FormErrors) {
  if (form.rarity !== 'festive') return;
  if (form.festiveEvent.trim() === '' || form.festiveEvent.trim().length > 40) errors.festiveEvent = 'Informe a data comemorativa (até 40 letras).';
  if (!isDay(form.availableFrom) || !isDay(form.availableUntil)) errors.period = 'Informe o início e o fim do período.';
  else if (form.availableUntil < form.availableFrom) errors.period = 'A data final precisa ser igual ou depois da inicial.';
}

function commonErrors(form: CommonForm, slugMax: number): FormErrors {
  const errors: FormErrors = {};
  const price = whole(form.price);
  if (form.name.trim().length < 2 || form.name.trim().length > 120) errors.name = 'Informe o nome (de 2 a 120 letras).';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim()) || form.slug.trim().length > slugMax) errors.slug = `Use letras minúsculas, números e hífens (até ${slugMax} caracteres).`;
  if (form.description.trim().length > 400) errors.description = 'A descrição passa de 400 caracteres.';
  if (!Number.isInteger(price) || price > 100000) errors.price = 'O preço deve ser um número inteiro de 0 a 100.000 chaves.';
  scheduleErrors(form, errors);
  if (form.rule.requirements.length > MAX_REQUIREMENTS) errors.requirements = `Use no máximo ${MAX_REQUIREMENTS} exigências.`;
  for (const entry of form.rule.requirements) {
    const message = requirementError(entry);
    if (message) errors[`req:${entry.id}`] = message;
  }
  return errors;
}

export function validateItemForm(form: ItemForm): FormErrors {
  const errors: FormErrors = { ...commonErrors(form, 80), ...(isLegacyType(form.type) ? { type: LEGACY_MESSAGE } : {}) };
  // Fundo e card não têm ajuste fino (o campo some do formulário): não há como corrigir o erro.
  const adjust = isThemeSlot(form.type) ? undefined : adjustError(form.adjust);
  if (adjust) errors.adjust = adjust;
  return errors;
}

export function validateKitForm(form: KitForm): FormErrors {
  const errors = commonErrors(form, 70);
  const included = form.pieces.filter((piece) => piece.on);
  if (included.length === 0) errors.pieces = 'Marque ao menos uma peça do kit.';
  for (const piece of included) {
    const message = piece.name.trim().length < 2 ? 'Dê um nome à peça (mínimo 2 letras).' : adjustError(piece.adjust);
    if (message) errors[`piece:${piece.type}`] = message;
  }
  return errors;
}

export type AnyForm = ItemForm | KitForm;
const FIELDS_OF_ERROR: Record<string, readonly string[]> = {
  festiveEvent: ['festiveEvent', 'rarity'], period: ['availableFrom', 'availableUntil', 'rarity'], requirements: ['rule'],
};
const json = (value: unknown) => JSON.stringify(value ?? null);
const fieldOf = (form: AnyForm, name: string) => json(Reflect.get(form, name));

function isStaleError(key: string, before: AnyForm, after: AnyForm): boolean {
  const [prefix, id] = key.split(':');
  if (prefix === 'req') {
    const entry = (form: AnyForm) => form.rule.requirements.find((candidate) => String(candidate.id) === id);
    return json(entry(before)) !== json(entry(after));
  }
  if (prefix === 'piece') {
    const piece = (form: AnyForm) => ('pieces' in form ? form.pieces.find((candidate) => candidate.type === id) : undefined);
    return json(piece(before)) !== json(piece(after));
  }
  return (FIELDS_OF_ERROR[key] ?? [key]).some((name) => fieldOf(before, name) !== fieldOf(after, name));
}

/** Tira o erro dos campos que mudaram desde a validação; os demais continuam até serem corrigidos. */
export function pruneErrors(errors: FormErrors, before: AnyForm, after: AnyForm): FormErrors {
  return Object.fromEntries(Object.entries(errors).filter(([key]) => !isStaleError(key, before, after)));
}

export const hasErrors = (errors: FormErrors): boolean => Object.keys(errors).length > 0;

export const isThemeSlot = (type: CollectibleItemType): boolean => THEME_TYPES.some((candidate) => candidate === type);
export const isItemSlot = (type: CollectibleItemType): boolean => ITEM_TYPES.some((candidate) => candidate === type);

interface PreviewPiece { artUrl: string | null; visualValue: string; layer: CollectibleLayer; adjust: AdjustDraft }

function lookPiece(piece: PreviewPiece): LookPiece | undefined {
  if (!piece.artUrl && !piece.visualValue) return undefined;
  return { visualValue: piece.visualValue, artUrl: piece.artUrl, color: null, adjust: parseAdjust(piece.adjust), layer: piece.layer };
}

/** Personagem da prévia ao vivo. Só as peças com arte (ou valor visual) aparecem; o resto é esperado e não é erro. */
export function itemPreviewLook(form: ItemForm): CharacterLook {
  const piece = isItemSlot(form.type) ? lookPiece(form) : undefined;
  return piece && isItemSlot(form.type) ? { [form.type]: piece } : {};
}

export function kitPreviewLook(form: KitForm): CharacterLook {
  const look: CharacterLook = {};
  for (const piece of form.pieces) {
    const entry = piece.on ? lookPiece(piece) : undefined;
    if (entry) look[piece.type] = entry;
  }
  return look;
}
