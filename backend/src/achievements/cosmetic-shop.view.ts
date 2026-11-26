import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { resolveCharacterColor } from './character-color';
import { loadShopCatalog, resolveArtUrls } from './cosmetic-shop.catalog';
import {
  buildEquippedList,
  buildShopItems,
  buildShopKits,
  collectArtKeys,
} from './cosmetic-shop.mapper';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { UsuarioCosmeticKit } from './entities/usuario-cosmetic-kit.entity';
import type { UnlockFactsLoader } from './unlock-evaluator';
import { resolveUnlocks } from './unlock-requirements';
import type { S3Service } from '../conteudo/s3/s3.service';
import { rankKey } from '../dashboard/rank-key';
import type { Usuario } from '../usuario/usuario.entity';

/** Monta a resposta do Shop: equipados, avulsos e kits, com liberação e arte. */
export async function buildShopView(params: {
  usuario_id: number;
  prestigeBalance: number;
  items: Repository<CosmeticItem>;
  userItems: Repository<UsuarioCosmetic>;
  kits: Repository<CosmeticKit>;
  userKits: Repository<UsuarioCosmeticKit>;
  users: Pick<Repository<Usuario>, 'findOne'>;
  unlockFacts?: UnlockFactsLoader;
  s3?: Pick<S3Service, 'resolveImageUrl'>;
  logger: Logger;
}) {
  const { usuario_id, prestigeBalance, unlockFacts, s3, logger } = params;
  const [owned, ownedKitRows, owner] = await Promise.all([
    params.userItems.find({
      where: { usuario_id },
      relations: ['cosmetic_item'],
    }),
    params.userKits.find({ where: { usuario_id } }),
    params.users.findOne({
      where: { id: usuario_id },
      select: { id: true, character_color: true },
    }),
  ]);
  const ownedByItem = new Map(
    owned.map((entry) => [entry.cosmetic_item_id, entry]),
  );
  const ownedKitIds = new Set(ownedKitRows.map((row) => row.kit_id));
  const { items, kits } = await loadShopCatalog(
    { items: params.items, kits: params.kits },
    [...ownedByItem.keys()],
    ownedKitIds,
  );
  // O que já é do aluno não precisa de regra; o resto é avaliado com um único carregamento de fatos.
  const pending = [
    ...items.filter((item) => !ownedByItem.has(item.id)),
    ...kits.filter((kit) => !ownedKitIds.has(kit.id)),
  ];
  const [unlocks, artUrls] = await Promise.all([
    resolveUnlocks(unlockFacts, usuario_id, pending),
    resolveArtUrls(s3, collectArtKeys(owned, items, kits), logger),
  ]);
  return {
    prestigeBalance,
    character: resolveCharacterColor(
      owner?.character_color,
      rankKey(usuario_id),
    ),
    equipped: buildEquippedList(owned, artUrls),
    items: buildShopItems({
      items,
      ownedByItem,
      unlocks,
      prestigeBalance,
      artUrls,
    }),
    kits: buildShopKits({
      kits,
      ownedKitIds,
      ownedItemIds: new Set(ownedByItem.keys()),
      unlocks,
      prestigeBalance,
      artUrls,
    }),
  };
}
