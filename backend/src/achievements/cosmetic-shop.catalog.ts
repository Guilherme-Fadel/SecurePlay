import { Logger } from '@nestjs/common';
import { In, IsNull, Repository } from 'typeorm';
import { isOnSale } from './availability';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import type { S3Service } from '../conteudo/s3/s3.service';

/**
 * O que o aluno enxerga no Shop: avulsos ativos e à venda, kits ativos e à
 * venda, e tudo o que ele já possui mesmo fora de venda (inclusive as peças
 * dos kits comprados, que ele equipa uma a uma).
 */
export async function loadShopCatalog(
  repositories: {
    items: Repository<CosmeticItem>;
    kits: Repository<CosmeticKit>;
  },
  ownedItemIds: number[],
  ownedKitIds: ReadonlySet<number>,
  now: Date = new Date(),
): Promise<{ items: CosmeticItem[]; kits: CosmeticKit[] }> {
  const ownedKitList = [...ownedKitIds];
  const [candidateItems, candidateKits] = await Promise.all([
    repositories.items.find({
      where: [
        { active: true, kit_id: IsNull() },
        ...(ownedItemIds.length ? [{ id: In(ownedItemIds) }] : []),
      ],
      order: { type: 'ASC', price: 'ASC' },
    }),
    repositories.kits.find({
      where: [
        { active: true },
        ...(ownedKitList.length ? [{ id: In(ownedKitList) }] : []),
      ],
      relations: { pieces: true },
      order: { price: 'ASC' },
    }),
  ]);
  const owned = new Set(ownedItemIds);
  return {
    items: candidateItems.filter(
      (item) => owned.has(item.id) || isOnSale(item, now),
    ),
    kits: candidateKits.filter(
      (kit) => ownedKitIds.has(kit.id) || isOnSale(kit, now),
    ),
  };
}

/** Resolve as URLs de arte; arte indisponível vira null sem derrubar o Shop. */
export async function resolveArtUrls(
  s3: Pick<S3Service, 'resolveImageUrl'> | undefined,
  keys: string[],
  logger: Logger,
): Promise<Map<string, string | null>> {
  const entries = await Promise.all(
    keys.map(async (key): Promise<[string, string | null]> => {
      try {
        return [key, (await s3?.resolveImageUrl(key)) ?? null];
      } catch (error) {
        const reason =
          error instanceof Error ? `${error.name}: ${error.message}` : 'erro';
        logger.warn(`Arte de colecionável indisponível (${key}): ${reason}`);
        return [key, null];
      }
    }),
  );
  return new Map(entries);
}
