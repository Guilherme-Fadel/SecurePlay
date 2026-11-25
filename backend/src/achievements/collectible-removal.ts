import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import type { Logger } from '@nestjs/common';
import type { S3Service } from '../conteudo/s3/s3.service';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { UsuarioCosmeticKit } from './entities/usuario-cosmetic-kit.entity';

const LOCK = { mode: 'pessimistic_write' } as const;
const NOT_FOUND = 'Colecionável não encontrado.';
const PIECE_OF_KIT =
  'Esta peça faz parte de um kit: exclua o kit ou tire a peça dele.';
/** Códigos do MySQL para "linha referenciada por chave estrangeira". */
const FK_CODES = new Set(['ER_ROW_IS_REFERENCED', 'ER_ROW_IS_REFERENCED_2']);

export type RemovalResult = { slug: string; artKeys: string[] };

export const ownersConflict = (owners: number) =>
  new ConflictException(
    `${owners} ${owners === 1 ? 'aluno já tem' : 'alunos já têm'} este item. Tire da loja em vez de excluir.`,
  );

/** Um aluno que já tem o item (ou o kit) impede a exclusão. */
export function asOwnersConflict(error: unknown) {
  const code = (error as { driverError?: { code?: string } })?.driverError
    ?.code;
  return code && FK_CODES.has(code) ? ownersConflict(1) : error;
}

const uniqueArt = (rows: Pick<CosmeticItem, 'art_key'>[]) => [
  ...new Set(rows.flatMap((row) => (row.art_key ? [row.art_key] : []))),
];

/** Trava o item, confere que nenhum aluno o tem e o exclui na mesma transação. */
export async function removeItem(
  manager: EntityManager,
  id: number,
): Promise<RemovalResult> {
  const items = manager.getRepository(CosmeticItem);
  const item = await items.findOne({ where: { id }, lock: LOCK });
  if (!item) throw new NotFoundException(NOT_FOUND);
  if (item.kit_id !== null) throw new BadRequestException(PIECE_OF_KIT);
  const owners = await manager
    .getRepository(UsuarioCosmetic)
    .find({ where: { cosmetic_item_id: id }, select: { usuario_id: true } });
  const distinct = new Set(owners.map((owner) => owner.usuario_id));
  if (distinct.size) throw ownersConflict(distinct.size);
  await items.delete({ id });
  return { slug: item.slug, artKeys: uniqueArt([item]) };
}

/** Trava o kit, confere compradores e donos de peças e exclui peças e kit. */
export async function removeKit(
  manager: EntityManager,
  id: number,
): Promise<RemovalResult> {
  const kits = manager.getRepository(CosmeticKit);
  const kit = await kits.findOne({ where: { id }, lock: LOCK });
  if (!kit) throw new NotFoundException(NOT_FOUND);
  const items = manager.getRepository(CosmeticItem);
  const pieces = await items.find({ where: { kit_id: id } });
  const buyers = await manager
    .getRepository(UsuarioCosmeticKit)
    .find({ where: { kit_id: id }, select: { usuario_id: true } });
  const holders = pieces.length
    ? await manager.getRepository(UsuarioCosmetic).find({
        where: { cosmetic_item_id: In(pieces.map((piece) => piece.id)) },
        select: { usuario_id: true },
      })
    : [];
  const distinct = new Set(
    [...buyers, ...holders].map((owner) => owner.usuario_id),
  );
  if (distinct.size) throw ownersConflict(distinct.size);
  await items.delete({ kit_id: id });
  await kits.delete({ id });
  return { slug: kit.slug, artKeys: uniqueArt(pieces) };
}

/** Depois do commit: apaga a arte que nenhum outro item usa; falha só vai para o log. */
export async function deleteUnusedArt(
  dataSource: DataSource,
  s3: Pick<S3Service, 'toS3Uri' | 'deleteObject'>,
  logger: Pick<Logger, 'warn'>,
  artKeys: string[],
) {
  const prefix = s3.toS3Uri('');
  for (const artKey of artKeys) {
    try {
      if (!artKey.startsWith(prefix)) continue;
      const shared = await dataSource
        .getRepository(CosmeticItem)
        .count({ where: { art_key: artKey } });
      if (shared > 0) continue;
      await s3.deleteObject(artKey.slice(prefix.length));
    } catch (error) {
      logger.warn(
        `Não foi possível apagar uma arte de colecionável excluído: ${
          error instanceof Error ? error.name : 'erro desconhecido'
        }`,
      );
    }
  }
}
