import { DataSource } from 'typeorm';
import { Achievement } from './entities/achievement.entity';
import { UsuarioAchievement } from './entities/usuario-achievement.entity';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import { PrestigeTransaction } from './entities/prestige-transaction.entity';

const repositoryProvider = (provide: string, entity: new () => object) => ({
  provide,
  useFactory: (dataSource: DataSource) => dataSource.getRepository(entity),
  inject: ['DATA_SOURCE'],
});

export const achievementsProviders = [
  repositoryProvider('ACHIEVEMENT_REPOSITORY', Achievement),
  repositoryProvider('USUARIO_ACHIEVEMENT_REPOSITORY', UsuarioAchievement),
  repositoryProvider('COSMETIC_ITEM_REPOSITORY', CosmeticItem),
  repositoryProvider('USUARIO_COSMETIC_REPOSITORY', UsuarioCosmetic),
  repositoryProvider('PRESTIGE_WALLET_REPOSITORY', PrestigeWallet),
  repositoryProvider('PRESTIGE_TRANSACTION_REPOSITORY', PrestigeTransaction),
];
