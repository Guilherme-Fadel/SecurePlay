import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { isOnSale } from './availability';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { UsuarioCosmeticKit } from './entities/usuario-cosmetic-kit.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import {
  PrestigeTransaction,
  PrestigeTransactionType,
} from './entities/prestige-transaction.entity';
import { lockPrestigeWallet } from './prestige-ledger';

/**
 * Relê o kit e suas peças ativas com o manager da transação, já com a carteira
 * travada: preço, `active`, janela de venda e peças valem os de agora, não os
 * lidos antes de abrir a transação.
 */
async function loadFreshKit(manager: EntityManager, kitId: number) {
  const kit = await manager.getRepository(CosmeticKit).findOne({
    where: { id: kitId },
    relations: { pieces: true },
  });
  if (!kit?.active) throw new NotFoundException('Kit não encontrado');
  if (!isOnSale(kit)) {
    throw new BadRequestException('Este kit não está mais à venda');
  }
  const pieces = kit.pieces.filter((piece) => piece.active);
  if (pieces.length === 0) {
    throw new BadRequestException('Este kit não tem peças disponíveis');
  }
  return { kit, pieces };
}

/**
 * Unidade de trabalho da compra de um kit: trava a carteira (o que serializa
 * compras simultâneas do mesmo aluno), confere que o kit ainda não é dele,
 * relê o kit, debita o Prestígio, registra a transação e entrega as peças sem
 * equipar. Peças que o aluno já tem (índice único usuário+item) são puladas,
 * mas o preço cobrado é o do kit inteiro. Roda sempre dentro de uma transação
 * aberta por quem chama.
 */
export async function executeKitPurchase(
  manager: EntityManager,
  params: { usuario_id: number; kitId: number },
): Promise<void> {
  const { usuario_id, kitId } = params;
  const wallet = await lockPrestigeWallet(manager, usuario_id);
  const ownedKits = manager.getRepository(UsuarioCosmeticKit);
  const existing = await ownedKits.findOne({
    where: { usuario_id, kit_id: kitId },
  });
  if (existing) throw new BadRequestException('Este kit já foi adquirido');
  const { kit, pieces } = await loadFreshKit(manager, kitId);
  if (!wallet || wallet.balance < kit.price) {
    throw new BadRequestException('Chaves Digitais insuficientes');
  }
  wallet.balance -= kit.price;
  await manager.getRepository(PrestigeWallet).save(wallet);
  const transactions = manager.getRepository(PrestigeTransaction);
  await transactions.save(
    transactions.create({
      usuario_id,
      amount: -kit.price,
      type: PrestigeTransactionType.PURCHASE,
      source_key: `kit:${kit.slug}`,
      description: `Kit adquirido no Shop: ${kit.name}`,
    }),
  );
  await ownedKits.save(ownedKits.create({ usuario_id, kit_id: kit.id }));
  const ownedPieces = manager.getRepository(UsuarioCosmetic);
  const alreadyOwned = new Set(
    (
      await ownedPieces.find({
        where: {
          usuario_id,
          cosmetic_item_id: In(pieces.map((piece) => piece.id)),
        },
      })
    ).map((entry) => entry.cosmetic_item_id),
  );
  const missing = pieces.filter((piece) => !alreadyOwned.has(piece.id));
  if (missing.length === 0) return;
  await ownedPieces.save(
    missing.map((piece) =>
      ownedPieces.create({
        usuario_id,
        cosmetic_item_id: piece.id,
        equipped: false,
        acquired_kit_id: kit.id,
      }),
    ),
  );
}
