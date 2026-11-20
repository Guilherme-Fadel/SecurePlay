import { BadRequestException, ConflictException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CosmeticItem, CosmeticType } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { applyAppearance, applyArt, ArtAsserter } from './collectible-fields';
import { assertSlotUnchanged } from './collectible-rules';
import { isCurrentPiece } from './collectible-views';
import type { KitPieceDto } from './dto/collectible-kit.dto';

/** No máximo uma peça por encaixe. */
export function assertUniqueSlots(pieces: KitPieceDto[]) {
  const seen = new Set<string>();
  for (const piece of pieces) {
    if (seen.has(piece.type)) {
      throw new BadRequestException(
        'O kit aceita no máximo uma peça por encaixe.',
      );
    }
    seen.add(piece.type);
  }
}

async function freeSlug(manager: EntityManager, kitSlug: string, type: string) {
  const items = manager.getRepository(CosmeticItem);
  const base = `${kitSlug}-${type}`;
  let candidate = base;
  for (let n = 2; await items.findOne({ where: { slug: candidate } }); n++) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}

const isDuplicateEntry = (error: unknown) => {
  const failure = error as
    | { code?: string; driverError?: { code?: string } }
    | undefined;
  return (failure?.code ?? failure?.driverError?.code) === 'ER_DUP_ENTRY';
};

/**
 * `freeSlug` lê antes de gravar: dois salvamentos simultâneos podem escolher o
 * mesmo identificador, e o índice único recusa o segundo. Isso é conflito, não 500.
 */
async function saveNewPiece(manager: EntityManager, piece: CosmeticItem) {
  try {
    await manager.getRepository(CosmeticItem).save(piece);
  } catch (error) {
    if (!isDuplicateEntry(error)) throw error;
    throw new ConflictException(
      'Outro cadastro usou o mesmo identificador. Tente salvar de novo.',
    );
  }
}

async function applyPieceFields(
  piece: CosmeticItem,
  dto: KitPieceDto,
  kit: CosmeticKit,
  assertArt: ArtAsserter,
) {
  assertSlotUnchanged(piece.type, dto.type);
  piece.name = dto.name;
  piece.type = dto.type as CosmeticType;
  piece.rarity = kit.rarity;
  piece.price = 0;
  piece.active = kit.active;
  piece.available_until = null;
  await applyArt(piece, dto.artKey, assertArt);
  applyAppearance(piece, dto);
}

function newPiece(manager: EntityManager, kit: CosmeticKit, slug: string) {
  return manager.getRepository(CosmeticItem).create({
    slug,
    description: kit.description,
    visual_value: '',
    required_achievement_slug: null,
    kit_id: kit.id,
    festive_event: null,
    available_from: null,
    unlock_rule: null,
    art_key: null,
    art_mime: null,
    layer: 'front',
    recolorable: false,
    adjust_x: 0,
    adjust_y: 0,
    adjust_scale: 1,
  });
}

/**
 * Sincroniza as peças do kit com o corpo da requisição. Peça nova nasce com
 * `kit_id`; peça existente precisa ser deste kit; peça omitida é arquivada.
 */
export async function syncKitPieces(
  manager: EntityManager,
  kit: CosmeticKit,
  dtoPieces: KitPieceDto[],
  assertArt: ArtAsserter,
): Promise<CosmeticItem[]> {
  const items = manager.getRepository(CosmeticItem);
  const existing = await items.find({ where: { kit_id: kit.id } });
  const byId = new Map(existing.map((piece) => [piece.id, piece]));
  const kept = new Set<number>();
  for (const dto of dtoPieces) {
    let piece: CosmeticItem;
    const isNew = dto.id === undefined;
    if (dto.id !== undefined) {
      const found = byId.get(dto.id);
      if (!found) {
        throw new BadRequestException(
          `A peça ${dto.id} não pertence a este kit.`,
        );
      }
      piece = found;
      kept.add(piece.id);
    } else {
      piece = newPiece(
        manager,
        kit,
        await freeSlug(manager, kit.slug, dto.type),
      );
    }
    await applyPieceFields(piece, dto, kit, assertArt);
    if (isNew) await saveNewPiece(manager, piece);
    else await items.save(piece);
    byId.set(piece.id, piece);
  }
  await archiveOmitted(manager, existing, kept);
  return [...byId.values()];
}

async function archiveOmitted(
  manager: EntityManager,
  existing: CosmeticItem[],
  kept: Set<number>,
) {
  const removedAt = new Date();
  for (const piece of existing) {
    if (kept.has(piece.id) || !isCurrentPiece(piece)) continue;
    piece.active = false;
    piece.available_until = removedAt;
    await manager.getRepository(CosmeticItem).save(piece);
  }
}
