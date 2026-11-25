import { DataSource, In, IsNull, Like } from 'typeorm';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { toItemView, toKitView } from './collectible-views';
import {
  CollectibleFilters,
  normalizeFilters,
  paginated,
} from './collectible-pagination';

type ResolveArt = (key: string | null) => Promise<string | null>;

export async function listItems(
  dataSource: DataSource,
  filters: CollectibleFilters,
  resolveArt: ResolveArt,
) {
  const { page, pageSize, search, type, active } = normalizeFilters(filters);
  const standalone = {
    kit_id: IsNull(),
    ...(type ? { type } : {}),
    ...(active === undefined ? {} : { active }),
  };
  const where = search
    ? [
        { ...standalone, name: Like(`%${search}%`) },
        { ...standalone, slug: Like(`%${search}%`) },
      ]
    : standalone;
  const [rows, total] = await dataSource
    .getRepository(CosmeticItem)
    .findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  const items = await Promise.all(
    rows.map((row) => toItemView(row, resolveArt)),
  );
  return paginated(items, total, page, pageSize);
}

export async function listKits(
  dataSource: DataSource,
  filters: CollectibleFilters,
  resolveArt: ResolveArt,
) {
  const { page, pageSize, search, active } = normalizeFilters(filters);
  const state = active === undefined ? {} : { active };
  const where = search
    ? [
        { ...state, name: Like(`%${search}%`) },
        { ...state, slug: Like(`%${search}%`) },
      ]
    : state;
  const [kits, total] = await dataSource
    .getRepository(CosmeticKit)
    .findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  const pieces = kits.length
    ? await dataSource
        .getRepository(CosmeticItem)
        .find({ where: { kit_id: In(kits.map((kit) => kit.id)) } })
    : [];
  const items = await Promise.all(
    kits.map((kit) =>
      toKitView(
        kit,
        pieces.filter((piece) => piece.kit_id === kit.id),
        resolveArt,
      ),
    ),
  );
  return paginated(items, total, page, pageSize);
}
