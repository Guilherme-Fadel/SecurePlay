import { BadRequestException } from '@nestjs/common';
import { CosmeticType } from './entities/cosmetic-item.entity';

export const COLLECTIBLE_STATUSES = {
  active: 'active',
  inactive: 'inactive',
} as const;
export type CollectibleStatus = keyof typeof COLLECTIBLE_STATUSES;

export type CollectibleFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  /** Só itens avulsos: encaixe do item. */
  type?: CosmeticType;
  status?: CollectibleStatus;
};

const isMember = (values: object, value: unknown) =>
  typeof value === 'string' && Object.values(values).includes(value);

/** Filtros opcionais da listagem: ausente vale "todos"; valor desconhecido é 400, nunca ignorado. */
function strictFilters({ type, status }: CollectibleFilters) {
  if (type !== undefined && !isMember(CosmeticType, type)) {
    throw new BadRequestException('Encaixe inválido');
  }
  if (status !== undefined && !isMember(COLLECTIBLE_STATUSES, status)) {
    throw new BadRequestException('Estado inválido');
  }
  return {
    type,
    ...(status ? { active: status === 'active' } : {}),
  };
}

/** Mesmos limites das demais listagens do console: página >= 1, 1..100 por página, busca de até 100. */
export function normalizeFilters(filters: CollectibleFilters) {
  const page = Number.isFinite(filters.page)
    ? Math.max(1, Math.floor(filters.page as number))
    : 1;
  const pageSize = Number.isFinite(filters.pageSize)
    ? Math.min(100, Math.max(1, Math.floor(filters.pageSize as number)))
    : 25;
  const search =
    typeof filters.search === 'string'
      ? filters.search
          .trim()
          .slice(0, 100)
          .replace(/[%_\\]/g, '\\$&')
      : '';
  return { page, pageSize, search, ...strictFilters(filters) };
}

export const paginated = <T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) => ({
  items,
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
});
