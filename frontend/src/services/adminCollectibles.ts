import { adminQueryKey } from '@/lib/adminCache';
import { invalidatePrefix } from '@/lib/queryCache';
import { api } from './api';
import type { CosmeticRarity, CosmeticType, LegacyCosmeticType } from './achievements';

/** Tipos espelhando as views e DTOs do backend (`collectible-views.ts`, `dto/collectible-*.dto.ts`). Só `platform_admin`. */

export type CollectibleKind = 'items' | 'kits';
export type CollectibleLayer = 'back' | 'front';
/** O catálogo do console ainda pode trazer itens antigos (moldura, título, emblema): só leitura, não se cria nem se salva. */
export type CollectibleItemType = CosmeticType | LegacyCosmeticType;
export type CollectibleSlotType = 'skin' | 'head' | 'face' | 'neck' | 'effect';

export interface CollectibleAdjust { x: number; y: number; scale: number }

export type UnlockCondition =
  | { metric: 'xp_season' | 'xp_total' | 'access_days' | 'streak'; min: number }
  | { metric: 'rank'; top: number; scope: 'empresa' | 'global' }
  | { metric: 'achievement'; slug: string };
export interface UnlockRule { mode: 'all' | 'any'; conditions: UnlockCondition[] }

export interface CollectibleItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  type: CollectibleItemType;
  rarity: CosmeticRarity;
  price: number;
  visualValue: string;
  kitId: number | null;
  festiveEvent: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  unlockRule: UnlockRule | null;
  /** Exigência antiga (conquista), só leitura no console; ainda vale na compra. */
  requiredAchievementSlug: string | null;
  artKey: string | null;
  artUrl: string | null;
  layer: CollectibleLayer;
  recolorable: boolean;
  adjust: CollectibleAdjust;
  active: boolean;
}

export interface CollectibleKit {
  id: number;
  slug: string;
  name: string;
  description: string;
  rarity: CosmeticRarity;
  price: number;
  festiveEvent: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  unlockRule: UnlockRule | null;
  active: boolean;
  pieces: CollectibleItem[];
}

export interface CollectiblePage<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number }
export interface CollectibleListParams {
  page: number;
  pageSize: number;
  search?: string;
  /** Só na listagem de itens avulsos: encaixe. */
  type?: CosmeticType;
  status?: 'active' | 'inactive';
}

interface CollectibleSchedule {
  festiveEvent?: string | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  unlockRule?: UnlockRule | null;
}

/** Corpo do POST/PATCH de item (`CollectibleItemDto`). O PATCH exige o corpo completo. */
export interface CollectibleItemInput extends CollectibleSchedule {
  name: string;
  slug: string;
  description: string;
  type: CosmeticType;
  rarity: CosmeticRarity;
  price: number;
  visualValue?: string;
  artKey?: string | null;
  layer?: CollectibleLayer;
  recolorable?: boolean;
  adjust?: Partial<CollectibleAdjust>;
}

export interface CollectibleKitPieceInput {
  id?: number;
  type: CollectibleSlotType;
  name: string;
  artKey?: string | null;
  layer?: CollectibleLayer;
  recolorable?: boolean;
  adjust?: Partial<CollectibleAdjust>;
}

/** Corpo do POST/PATCH de kit (`CollectibleKitDto`). */
export interface CollectibleKitInput extends CollectibleSchedule {
  name: string;
  slug: string;
  description: string;
  rarity: CosmeticRarity;
  price: number;
  pieces: CollectibleKitPieceInput[];
}

const BASE = '/admin/collectibles';
/** Mesmos limites do backend (`collectible-art.ts`): PNG ou SVG de até 200 KB. */
export const COLLECTIBLE_ART_TYPES = ['image/png', 'image/svg+xml'] as const;
export const COLLECTIBLE_ART_MAX_BYTES = 200 * 1024;

const changed = () => invalidatePrefix(adminQueryKey('collectibles'));

export async function listCollectibleItems(params: CollectibleListParams): Promise<CollectiblePage<CollectibleItem>> {
  return (await api.get(`${BASE}/items`, { params })).data;
}

export async function listCollectibleKits(params: CollectibleListParams): Promise<CollectiblePage<CollectibleKit>> {
  return (await api.get(`${BASE}/kits`, { params })).data;
}

export async function createCollectibleItem(input: CollectibleItemInput): Promise<CollectibleItem> {
  const result = await api.post(`${BASE}/items`, input);
  changed();
  return result.data;
}

export async function updateCollectibleItem(id: number, input: CollectibleItemInput): Promise<CollectibleItem> {
  const result = await api.patch(`${BASE}/items/${id}`, input);
  changed();
  return result.data;
}

export async function createCollectibleKit(input: CollectibleKitInput): Promise<CollectibleKit> {
  const result = await api.post(`${BASE}/kits`, input);
  changed();
  return result.data;
}

export async function updateCollectibleKit(id: number, input: CollectibleKitInput): Promise<CollectibleKit> {
  const result = await api.patch(`${BASE}/kits/${id}`, input);
  changed();
  return result.data;
}

/** O backend valida regra festiva, arte e valor visual antes de publicar. */
export async function publishCollectible(kind: CollectibleKind, id: number): Promise<CollectibleItem | CollectibleKit> {
  const result = await api.post(`${BASE}/${kind}/${id}/publish`);
  changed();
  return result.data;
}

export async function archiveCollectible(kind: CollectibleKind, id: number): Promise<CollectibleItem | CollectibleKit> {
  const result = await api.post(`${BASE}/${kind}/${id}/archive`);
  changed();
  return result.data;
}

/** Exclusão definitiva: o backend recusa (409) quando algum aluno já tem o colecionável. */
export async function deleteCollectible(kind: CollectibleKind, id: number): Promise<void> {
  await api.delete(`${BASE}/${kind}/${id}`);
  changed();
}

/**
 * Envia a arte: POST pré-assinado, upload ao bucket (arquivo por último, como exige o S3) e confirmação,
 * que valida e promove o arquivo. Devolve a chave a gravar no cadastro e a URL de pré-visualização.
 */
export async function uploadCollectibleArt(file: Blob): Promise<{ artKey: string; artUrl: string | null }> {
  if (!(COLLECTIBLE_ART_TYPES as readonly string[]).includes(file.type)) throw new Error('Use um arquivo PNG ou SVG.');
  if (file.size > COLLECTIBLE_ART_MAX_BYTES) throw new Error('O arquivo passa de 200 KB.');
  const { uploadUrl, fields, key } = (await api.post(`${BASE}/art/upload`, { contentType: file.type })).data as { uploadUrl: string; fields: Record<string, string>; key: string };
  const form = new FormData();
  Object.entries(fields).forEach(([name, value]) => form.append(name, value));
  form.append('file', file);
  if (!(await fetch(uploadUrl, { method: 'POST', body: form })).ok) throw new Error('Não foi possível enviar a arte.');
  return (await api.post(`${BASE}/art/confirm`, { key })).data;
}
