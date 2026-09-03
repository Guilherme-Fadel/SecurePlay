import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  Achievement,
  AchievementRequirement,
} from './entities/achievement.entity';
import { UsuarioAchievement } from './entities/usuario-achievement.entity';
import { CosmeticItem, CosmeticType } from './entities/cosmetic-item.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import {
  PrestigeTransaction,
  PrestigeTransactionType,
} from './entities/prestige-transaction.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { UsuarioChallenge } from '../usuario-challenge/usuario-challenge.entity';
import { UsuarioAula } from '../conteudo/usuario-aula/usuario-aula.entity';
import { UsuarioArcadeStats } from '../arcade/entities/usuario-arcade-stats.entity';
import { calcLevel } from '../common/utils/xp.utils';
import { OnEvent } from '@nestjs/event-emitter';
import { S3Service } from '../conteudo/s3/s3.service';

export interface AchievementMetrics {
  total_xp: number;
  level: number;
  challenges_completed: number;
  lessons_completed: number;
  streak: number;
  arcade_plays: number;
  perfect_arcade_runs: number;
}

export interface AchievementTrailNode {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: Achievement['category'];
  rarity: Achievement['rarity'];
  tier: number;
  icon: string;
  rewardPrestige: number | null;
  prerequisiteSlug: string | null;
  position: { x: number; y: number };
  progress: number;
  target: number | null;
  progressPercent: number;
  status: 'unlocked' | 'in_progress' | 'locked';
  unlockedAt: Date | null;
  secret: boolean;
}

export interface AchievementTrailResponse {
  summary: {
    unlocked: number;
    total: number;
    progressPercent: number;
    prestigeBalance: number;
    prestigeEarned: number;
    level: number;
  };
  metrics: AchievementMetrics;
  nodes: AchievementTrailNode[];
}

@Injectable()
export class AchievementsService {
  constructor(
    @Inject('ACHIEVEMENT_REPOSITORY')
    private achievementRepository: Repository<Achievement>,
    @Inject('USUARIO_ACHIEVEMENT_REPOSITORY')
    private usuarioAchievementRepository: Repository<UsuarioAchievement>,
    @Inject('COSMETIC_ITEM_REPOSITORY')
    private cosmeticRepository: Repository<CosmeticItem>,
    @Inject('USUARIO_COSMETIC_REPOSITORY')
    private usuarioCosmeticRepository: Repository<UsuarioCosmetic>,
    @Inject('PRESTIGE_WALLET_REPOSITORY')
    private walletRepository: Repository<PrestigeWallet>,
    @Inject('PRESTIGE_TRANSACTION_REPOSITORY')
    private transactionRepository: Repository<PrestigeTransaction>,
    @Inject('USUARIO_STATS_REPOSITORY')
    private statsRepository: Repository<UsuarioStats>,
    @Inject('USUARIO_CHALLENGE_REPOSITORY')
    private usuarioChallengeRepository: Repository<UsuarioChallenge>,
    @Inject('USUARIO_AULA_REPOSITORY')
    private usuarioAulaRepository: Repository<UsuarioAula>,
    @Inject('USUARIO_ARCADE_STATS_REPOSITORY')
    private arcadeStatsRepository: Repository<UsuarioArcadeStats>,
    @Inject('DATA_SOURCE')
    private dataSource: DataSource,
    @Optional() private readonly s3Service?: S3Service,
  ) {}

  @OnEvent('progress.changed')
  async synchronizeProgress(payload: { usuarioId: number }): Promise<void> {
    await this.getTrail(payload.usuarioId);
  }

  private async resolveArtwork(definition: Achievement): Promise<string> {
    const source = definition.image_url;
    if (!source) return definition.icon;
    if (!source.startsWith('s3://')) return source;
    if (!this.s3Service) return definition.icon;
    try {
      return (await this.s3Service.resolveImageUrl(source)) ?? definition.icon;
    } catch {
      return definition.icon;
    }
  }

  private async getWallet(usuario_id: number): Promise<PrestigeWallet> {
    let wallet = await this.walletRepository.findOne({ where: { usuario_id } });
    if (!wallet) {
      wallet = this.walletRepository.create({
        usuario_id,
        balance: 0,
        total_earned: 0,
      });
      wallet = await this.walletRepository.save(wallet);
    }
    return wallet;
  }

  private async addTransaction(
    wallet: PrestigeWallet,
    amount: number,
    type: PrestigeTransactionType,
    source_key: string,
    description: string,
  ): Promise<boolean> {
    const existing = await this.transactionRepository.findOne({
      where: { usuario_id: wallet.usuario_id, source_key },
    });
    if (existing) return false;
    const transaction = this.transactionRepository.create({
      usuario_id: wallet.usuario_id,
      amount,
      type,
      source_key,
      description,
    });
    await this.transactionRepository.save(transaction);
    wallet.balance += amount;
    if (amount > 0) wallet.total_earned += amount;
    await this.walletRepository.save(wallet);
    return true;
  }

  private async getMetrics(usuario_id: number): Promise<AchievementMetrics> {
    const [stats, challenges, lessons, arcade] = await Promise.all([
      this.statsRepository.findOne({ where: { usuario_id } }),
      this.usuarioChallengeRepository.count({
        where: { usuario_id, completed: true },
      }),
      this.usuarioAulaRepository.count({
        where: { usuario_id, completed: true },
      }),
      this.arcadeStatsRepository.find({ where: { usuario_id } }),
    ]);
    const totalXp = stats?.total_points ?? 0;
    return {
      total_xp: totalXp,
      level: calcLevel(totalXp),
      challenges_completed: challenges,
      lessons_completed: lessons,
      streak: stats?.current_streak ?? 0,
      arcade_plays: arcade.reduce((sum, item) => sum + item.total_plays, 0),
      perfect_arcade_runs: arcade.reduce(
        (sum, item) => sum + item.perfect_runs,
        0,
      ),
    };
  }

  private metricValue(
    metrics: AchievementMetrics,
    requirement: AchievementRequirement,
  ): number {
    return metrics[requirement];
  }

  private async grantLevelPrestige(
    wallet: PrestigeWallet,
    level: number,
  ): Promise<void> {
    for (let currentLevel = 2; currentLevel <= level; currentLevel += 1) {
      await this.addTransaction(
        wallet,
        1,
        PrestigeTransactionType.LEVEL,
        `level:${currentLevel}`,
        `Prestígio recebido ao alcançar o nível ${currentLevel}`,
      );
    }
  }

  async getTrail(usuario_id: number): Promise<AchievementTrailResponse> {
    const [definitions, metrics, wallet] = await Promise.all([
      this.achievementRepository.find({
        where: { active: true },
        order: { order_index: 'ASC', tier: 'ASC' },
      }),
      this.getMetrics(usuario_id),
      this.getWallet(usuario_id),
    ]);
    await this.grantLevelPrestige(wallet, metrics.level);
    const records = await this.usuarioAchievementRepository.find({
      where: { usuario_id },
    });
    const recordsByAchievement = new Map(
      records.map((record) => [record.achievement_id, record]),
    );
    const unlockedSlugs = new Set<string>();
    const nodes: AchievementTrailNode[] = [];
    for (const definition of definitions) {
      let record = recordsByAchievement.get(definition.id);
      const prerequisiteMet =
        !definition.prerequisite_slug ||
        unlockedSlugs.has(definition.prerequisite_slug);
      const metric = this.metricValue(metrics, definition.requirement_type);
      const progress = Math.min(metric, definition.requirement_value);
      const shouldUnlock =
        prerequisiteMet && metric >= definition.requirement_value;
      const newlyUnlocked = shouldUnlock && !record?.unlocked;
      if (!record) {
        record = this.usuarioAchievementRepository.create({
          usuario_id,
          achievement_id: definition.id,
          progress,
          unlocked: shouldUnlock,
          unlocked_at: shouldUnlock ? new Date() : null,
        });
      } else {
        record.progress = progress;
        if (shouldUnlock && !record.unlocked) {
          record.unlocked = true;
          record.unlocked_at = new Date();
        }
      }
      await this.usuarioAchievementRepository.save(record);
      if (record.unlocked) unlockedSlugs.add(definition.slug);
      if (newlyUnlocked) {
        await this.addTransaction(
          wallet,
          definition.reward_prestige,
          PrestigeTransactionType.ACHIEVEMENT,
          `achievement:${definition.slug}`,
          `Conquista desbloqueada: ${definition.name}`,
        );
      }
      const concealed = definition.secret && !record.unlocked;
      nodes.push({
        id: definition.id,
        slug: definition.slug,
        name: concealed ? 'Conquista secreta' : definition.name,
        description: concealed
          ? 'Continue avançando para revelar esta conquista.'
          : definition.description,
        category: definition.category,
        rarity: definition.rarity,
        tier: definition.tier,
        icon: concealed ? 'lock-keyhole' : await this.resolveArtwork(definition),
        rewardPrestige: concealed ? null : definition.reward_prestige,
        prerequisiteSlug: definition.prerequisite_slug,
        position: { x: definition.position_x, y: definition.position_y },
        progress: concealed ? 0 : record.progress,
        target: concealed ? null : definition.requirement_value,
        progressPercent: concealed
          ? 0
          : Math.min(
              100,
              Math.round(
                (record.progress / definition.requirement_value) * 100,
              ),
            ),
        status: record.unlocked
          ? 'unlocked'
          : prerequisiteMet
            ? 'in_progress'
            : 'locked',
        unlockedAt: record.unlocked_at,
        secret: definition.secret,
      });
    }
    const refreshedWallet = await this.getWallet(usuario_id);
    const unlocked = nodes.filter((node) => node.status === 'unlocked').length;
    return {
      summary: {
        unlocked,
        total: nodes.length,
        progressPercent:
          nodes.length === 0 ? 0 : Math.round((unlocked / nodes.length) * 100),
        prestigeBalance: refreshedWallet.balance,
        prestigeEarned: refreshedWallet.total_earned,
        level: metrics.level,
      },
      metrics,
      nodes,
    };
  }

  async getShop(usuario_id: number) {
    const trail = await this.getTrail(usuario_id);
    const [items, owned] = await Promise.all([
      this.cosmeticRepository.find({
        where: { active: true },
        order: { type: 'ASC', price: 'ASC' },
      }),
      this.usuarioCosmeticRepository.find({
        where: { usuario_id },
        relations: ['cosmetic_item'],
      }),
    ]);
    const ownedByItem = new Map(
      owned.map((item) => [item.cosmetic_item_id, item]),
    );
    const unlockedSlugs = new Set(
      trail.nodes
        .filter((node) => node.status === 'unlocked')
        .map((node) => node.slug),
    );
    return {
      prestigeBalance: trail.summary.prestigeBalance,
      equipped: owned
        .filter((item) => item.equipped)
        .map((item) => ({
          type: item.cosmetic_item.type,
          slug: item.cosmetic_item.slug,
          visualValue: item.cosmetic_item.visual_value,
        })),
      items: items.map((item) => {
        const userItem = ownedByItem.get(item.id);
        const requirementMet =
          !item.required_achievement_slug ||
          unlockedSlugs.has(item.required_achievement_slug);
        return {
          id: item.id,
          slug: item.slug,
          name: item.name,
          description: item.description,
          type: item.type,
          rarity: item.rarity,
          price: item.price,
          visualValue: item.visual_value,
          requiredAchievementSlug: item.required_achievement_slug,
          requirementMet,
          owned: !!userItem,
          equipped: !!userItem?.equipped,
          affordable: trail.summary.prestigeBalance >= item.price,
        };
      }),
    };
  }

  async purchase(usuario_id: number, itemId: number) {
    const item = await this.cosmeticRepository.findOne({
      where: { id: itemId, active: true },
    });
    if (!item) throw new NotFoundException('Item cosmético não encontrado');
    const trail = await this.getTrail(usuario_id);
    if (
      item.required_achievement_slug &&
      !trail.nodes.some(
        (node) =>
          node.slug === item.required_achievement_slug &&
          node.status === 'unlocked',
      )
    ) {
      throw new BadRequestException(
        'A conquista necessária ainda está bloqueada',
      );
    }
    await this.dataSource.transaction(async (manager) => {
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
    });
    return this.getShop(usuario_id);
  }

  async equip(usuario_id: number, itemId: number) {
    const selected = await this.usuarioCosmeticRepository.findOne({
      where: { usuario_id, cosmetic_item_id: itemId },
      relations: ['cosmetic_item'],
    });
    if (!selected)
      throw new NotFoundException('Adquira o item antes de equipar');
    const owned = await this.usuarioCosmeticRepository.find({
      where: { usuario_id },
      relations: ['cosmetic_item'],
    });
    const sameType = owned.filter(
      (item) => item.cosmetic_item.type === selected.cosmetic_item.type,
    );
    for (const item of sameType) item.equipped = item.id === selected.id;
    await this.usuarioCosmeticRepository.save(sameType);
    return this.getShop(usuario_id);
  }

  async unequip(usuario_id: number, type: CosmeticType) {
    const owned = await this.usuarioCosmeticRepository.find({
      where: { usuario_id },
      relations: ['cosmetic_item'],
    });
    const sameType = owned.filter((item) => item.cosmetic_item.type === type);
    for (const item of sameType) item.equipped = false;
    await this.usuarioCosmeticRepository.save(sameType);
    return this.getShop(usuario_id);
  }
}
