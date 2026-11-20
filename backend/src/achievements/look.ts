import { Logger } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { resolveArtUrls } from './cosmetic-shop.catalog';
import { CosmeticItem, CosmeticType } from './entities/cosmetic-item.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import type { S3Service } from '../conteudo/s3/s3.service';

/** Peça equipada, no formato que o front desenha. Nada além disto sai do backend. */
export interface LookPiece {
  visualValue: string;
  artUrl: string | null;
  color: string | null;
  adjust: { x: number; y: number; scale: number };
  layer: 'back' | 'front';
}

export interface CharacterLook {
  skin?: LookPiece;
  head?: LookPiece;
  face?: LookPiece;
  neck?: LookPiece;
  effect?: LookPiece;
  background?: LookPiece;
  card?: LookPiece;
}

/** Encaixes do personagem; moldura, título e emblema não fazem parte do visual. */
export const LOOK_SLOTS = [
  CosmeticType.SKIN,
  CosmeticType.HEAD,
  CosmeticType.FACE,
  CosmeticType.NECK,
  CosmeticType.EFFECT,
  CosmeticType.BACKGROUND,
  CosmeticType.CARD,
] as const;

type LookSlot = (typeof LOOK_SLOTS)[number];
const isLookSlot = (type: CosmeticType): type is LookSlot =>
  (LOOK_SLOTS as readonly CosmeticType[]).includes(type);

/** Mesma peça do Shop (`equipped`) e do ranking: um só mapeamento. */
export function toLookPiece(
  item: CosmeticItem,
  color: string | null,
  artUrl: string | null,
): LookPiece {
  return {
    visualValue: item.visual_value,
    artUrl,
    color,
    adjust: { x: item.adjust_x, y: item.adjust_y, scale: item.adjust_scale },
    layer: item.layer ?? 'front',
  };
}

/**
 * Visual equipado de cada aluno em uma única consulta. Todo ID pedido volta no
 * mapa; quem não equipou nada recebe `{}`. Sem cache por aluno: equipar tem de
 * aparecer na próxima leitura.
 */
export async function loadLooks(
  deps: {
    userItems: Pick<Repository<UsuarioCosmetic>, 'find'>;
    s3?: Pick<S3Service, 'resolveImageUrl'>;
    logger: Logger;
  },
  userIds: number[],
): Promise<Map<number, CharacterLook>> {
  const looks = new Map<number, CharacterLook>(userIds.map((id) => [id, {}]));
  if (!userIds.length) return looks;
  const rows = await deps.userItems.find({
    where: {
      usuario_id: In([...new Set(userIds)]),
      equipped: true,
      cosmetic_item: { type: In([...LOOK_SLOTS]) },
    },
    relations: { cosmetic_item: true },
  });
  const worn = rows.filter(
    (row) => row.equipped && isLookSlot(row.cosmetic_item.type),
  );
  const keys = new Set<string>();
  for (const { cosmetic_item: item } of worn)
    if (item.art_key) keys.add(item.art_key);
  const artUrls = await resolveArtUrls(deps.s3, [...keys], deps.logger);
  for (const { usuario_id, color, cosmetic_item: item } of worn) {
    const artUrl = item.art_key ? (artUrls.get(item.art_key) ?? null) : null;
    const look = looks.get(usuario_id);
    if (look) look[item.type as LookSlot] = toLookPiece(item, color, artUrl);
  }
  return looks;
}
