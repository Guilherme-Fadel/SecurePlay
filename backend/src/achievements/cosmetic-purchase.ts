import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import {
  PrestigeTransaction,
  PrestigeTransactionType,
} from './entities/prestige-transaction.entity';

/**
 * Unidade de trabalho da compra de um cosmetico: debita o Prestigio, registra a
 * transacao e equipa o item adquirido substituindo o do mesmo tipo. Roda sempre
 * dentro de uma transacao (recebe o EntityManager de quem a abriu).
 */
export async function executeCosmeticPurchase(
  manager: EntityManager,
  params: { usuario_id: number; item: CosmeticItem },
): Promise<void> {
  const { usuario_id, item } = params;
  const walletRepository = manager.getRepository(PrestigeWallet);
  const userCosmeticRepository = manager.getRepository(UsuarioCosmetic);
  const transactionRepository = manager.getRepository(PrestigeTransaction);
  const existing = await userCosmeticRepository.findOne({
    where: { usuario_id, cosmetic_item_id: item.id },
  });
  if (existing) throw new BadRequestException('Este item já foi adquirido');
  const wallet = await walletRepository.findOne({
    where: { usuario_id },
    lock: { mode: 'pessimistic_write' },
  });
  if (!wallet || wallet.balance < item.price) {
    throw new BadRequestException('Prestígio insuficiente');
  }
  wallet.balance -= item.price;
  await walletRepository.save(wallet);
  await transactionRepository.save(
    transactionRepository.create({
      usuario_id,
      amount: -item.price,
      type: PrestigeTransactionType.PURCHASE,
      source_key: `purchase:${item.slug}`,
      description: `Item adquirido no Shop: ${item.name}`,
    }),
  );
  const ownedCosmetics = await userCosmeticRepository.find({
    where: { usuario_id },
    relations: ['cosmetic_item'],
  });
  const equippedSameType = ownedCosmetics.filter(
    (ownedItem) => ownedItem.cosmetic_item.type === item.type,
  );
  for (const ownedItem of equippedSameType) ownedItem.equipped = false;
  if (equippedSameType.length > 0) {
    await userCosmeticRepository.save(equippedSameType);
  }
  await userCosmeticRepository.save(
    userCosmeticRepository.create({
      usuario_id,
      cosmetic_item_id: item.id,
      equipped: true,
    }),
  );
}
