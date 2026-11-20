import { keysLabel, rarityLabel, typeLabel } from '@/components/sections/HomePage/Awards/collectiblesModel';
import type { CharacterLook } from '@/services/dashboard';
import type { CosmeticRarity, CosmeticType } from '@/services/achievements';
import type { CollectibleItem, CollectibleKind, CollectibleKit } from '@/services/adminCollectibles';

/** Regras puras das listagens de Colecionáveis do console. O backend decide estado e publicação. */

export type { CollectibleKind };
export type CollectibleStatus = 'unpublished' | 'published' | 'archived';
export type CollectibleRow = CollectibleItem | CollectibleKit;

export const isKit = (row: CollectibleRow): row is CollectibleKit => 'pieces' in row;

export const kindCopy: Record<CollectibleKind, { tab: string; newLabel: string; searchLabel: string; empty: string; emptySearch: string; emptyFilter: string }> = {
  items: { tab: 'Itens avulsos', newLabel: 'Novo item', searchLabel: 'Buscar itens', empty: 'Nenhum item cadastrado ainda.', emptySearch: 'Nenhum item corresponde à busca.', emptyFilter: 'Nenhum item neste filtro.' },
  kits: { tab: 'Kits', newLabel: 'Novo kit', searchLabel: 'Buscar kits', empty: 'Nenhum kit cadastrado ainda.', emptySearch: 'Nenhum kit corresponde à busca.', emptyFilter: 'Nenhum kit neste filtro.' },
};

/** Abas por encaixe das listagens de itens; `''` é "Todos". Só os encaixes que o cadastro aceita. */
export const TYPE_FILTERS: ReadonlyArray<{ value: '' | CosmeticType; label: string }> = [
  { value: '', label: 'Todos' },
  ...(['skin', 'head', 'face', 'neck', 'effect', 'background', 'card'] as const).map((value) => ({ value, label: typeLabel[value] })),
];

export const STATUS_FILTERS: ReadonlyArray<{ value: '' | 'active' | 'inactive'; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Publicados' },
  { value: 'inactive', label: 'Não publicados' },
];

export const statusLabel: Record<CollectibleStatus, string> = { unpublished: 'Não publicado', published: 'Publicado', archived: 'Arquivado' };

/**
 * A listagem só informa `active`: o backend não separa rascunho de arquivado, então inativo é só "Não publicado".
 * `archived` fica no mapa de rótulos para quando a API expuser o motivo; hoje nenhum caminho chega nele.
 */
export function collectibleStatus(entry: { active: boolean }): CollectibleStatus {
  return entry.active ? 'published' : 'unpublished';
}

/** Publicado pode sair da loja (arquivar no backend); inativo pode ser publicado (o backend valida arte e período). */
export function rowActions(entry: { active: boolean }) {
  return { edit: true, publish: !entry.active, archive: entry.active };
}

export const slotLabel = (type: CosmeticType): string => typeLabel[type];
export const rarityName = (rarity: CosmeticRarity): string => rarityLabel[rarity];

export function priceLabel(price: number): string {
  return keysLabel(price);
}

const PIECE_ORDER: readonly CosmeticType[] = ['skin', 'head', 'face', 'neck', 'effect'];

/** "3 peças: Skin, Cabeça, Efeito", na ordem das camadas do personagem. */
export function piecesLabel(pieces: ReadonlyArray<{ type: CosmeticType }>): string {
  if (pieces.length === 0) return 'Sem peças';
  const rank = (type: CosmeticType) => { const index = PIECE_ORDER.indexOf(type); return index === -1 ? PIECE_ORDER.length : index; };
  const slots = pieces.map((piece) => piece.type).sort((a, b) => rank(a) - rank(b)).map(slotLabel);
  return `${pieces.length} ${pieces.length === 1 ? 'peça' : 'peças'}: ${slots.join(', ')}`;
}

function brasiliaDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

interface PeriodEntry { rarity: CosmeticRarity; festiveEvent: string | null; availableFrom: string | null; availableUntil: string | null }

/** Período só vale para Comemorativa (evento e janela, datas de Brasília); as demais mostram "—". */
export function periodLabel(entry: PeriodEntry): string {
  if (entry.rarity !== 'festive') return '—';
  const from = brasiliaDate(entry.availableFrom);
  const until = brasiliaDate(entry.availableUntil);
  const window = from && until ? `${from} a ${until}` : until ? `até ${until}` : from ? `a partir de ${from}` : null;
  const name = entry.festiveEvent || (window ? '' : 'Comemorativa');
  return [name, window].filter(Boolean).join(' · ');
}

export interface CollectibleListFilters { page?: number; pageSize?: number; search?: string; type?: string; status?: string }
export interface CollectibleListQuery { page: number; pageSize: number; search?: string; type?: CosmeticType; status?: 'active' | 'inactive' }

/**
 * Query da listagem, nos mesmos limites do backend: página ≥ 1, 1 a 100 por página, busca de até 100.
 * `type` só vale para itens (kits não têm encaixe); valores desconhecidos ficam de fora, como "Todos".
 */
export function listParams(filters: CollectibleListFilters, kind: CollectibleKind = 'items'): CollectibleListQuery {
  const page = Number.isFinite(filters.page) ? Math.max(1, Math.floor(filters.page as number)) : 1;
  const pageSize = Number.isFinite(filters.pageSize) ? Math.min(100, Math.max(1, Math.floor(filters.pageSize as number))) : 25;
  const search = typeof filters.search === 'string' ? filters.search.trim().slice(0, 100) : '';
  const type = kind === 'items' ? TYPE_FILTERS.find((entry) => entry.value && entry.value === filters.type)?.value : undefined;
  const status = STATUS_FILTERS.find((entry) => entry.value && entry.value === filters.status)?.value;
  return { page, pageSize, ...(search ? { search } : {}), ...(type ? { type } : {}), ...(status ? { status } : {}) };
}

/** Qualquer filtro além da paginação ativo: a lista vazia vira "nenhum resultado" em vez de "nada cadastrado". */
export const hasActiveFilter = (query: CollectibleListQuery): boolean => Boolean(query.search || query.type || query.status);

/** Exigência de desbloqueio: regra nova ou conquista antiga (só itens). */
export function hasRule(row: CollectibleRow): boolean {
  return Boolean(row.unlockRule) || (!isKit(row) && Boolean(row.requiredAchievementSlug));
}

/** Selos do cartão, na ordem de leitura. Comemorativa traz o período; "Recolorível" só existe em itens. */
export function cardBadges(row: CollectibleRow): string[] {
  const period = periodLabel(row);
  return [
    ...(row.rarity === 'festive' ? [period === 'Comemorativa' ? period : `Comemorativa · ${period}`] : []),
    ...(hasRule(row) ? ['Com regra'] : []),
    ...(!isKit(row) && row.recolorable ? ['Recolorível'] : []),
  ];
}

/** Personagem vestindo as peças do kit (uma por encaixe de personagem), como no cartão de kit do aluno. */
export function kitLook(kit: Pick<CollectibleKit, 'pieces'>): CharacterLook {
  const look: CharacterLook = {};
  for (const piece of kit.pieces) {
    if (!PIECE_ORDER.includes(piece.type)) continue;
    look[piece.type as keyof CharacterLook] = { visualValue: piece.visualValue, artUrl: piece.artUrl, color: null, adjust: piece.adjust, layer: piece.layer };
  }
  return look;
}

/** Formulário aberto: cadastro novo (sem `record`) ou edição de um registro. */
export interface OpenForm { kind: CollectibleKind; record?: CollectibleItem | CollectibleKit }

/** Estado de navegação que mantém o formulário aberto (e o registro) no histórico. */
export const formNavigationState = (open: OpenForm) => ({ collectibleForm: open });

/** Estado de navegação de um registro já salvo: o histórico passa a guardar a versão mais recente, em modo de edição. */
export function savedFormState(row: CollectibleItem | CollectibleKit) {
  return formNavigationState({ kind: 'pieces' in row ? 'kits' : 'items', record: row });
}

/** Lê o formulário aberto do estado de navegação; qualquer outra coisa (ou tipo inválido) é "nenhum". */
export function openFormOf(state: unknown): OpenForm | null {
  const open = typeof state === 'object' && state !== null ? (state as { collectibleForm?: OpenForm }).collectibleForm : undefined;
  return open && (open.kind === 'items' || open.kind === 'kits') ? open : null;
}
