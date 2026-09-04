import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Achievement } from './entities/achievement.entity';
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
import { OnEvent } from '@nestjs/event-emitter';
import { S3Service } from '../conteudo/s3/s3.service';
import {
  AchievementMetrics,
  AchievementTrailNode,
  AchievementTrailResponse,
} from './achievements.types';
import { buildMetrics, metricValue } from './achievement-metrics';
import { buildTrailNode, buildTrailSummary } from './achievement-trail.mapper';
import { buildEquippedList, buildShopItems } from './cosmetic-shop.mapper';
import { executeCosmeticPurchase } from './cosmetic-purchase';

// A interface publica deste arquivo nao muda: quem importava os tipos daqui
// continua importando daqui.
export type {
  AchievementMetrics,
  AchievementTrailNode,
  AchievementTrailResponse,
} from './achievements.types';

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

  private async resolveArtwork(
    definition: Achievement,
  ): Promise<string | null> {
    const source = definition.image_url;
    if (!source) return null;
    if (!source.startsWith('s3://')) return source;
    if (!this.s3Service) return null;
    try {
      return await this.s3Service.resolveImageUrl(source);
    } catch {
      return null;
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
    return buildMetrics({
      stats,
      challenges_completed: challenges,
      lessons_completed: lessons,
      arcade,
    });
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
      const metric = metricValue(metrics, definition.requirement_type);
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
      nodes.push(
        buildTrailNode({
          definition,
          record,
          prerequisiteMet,
          concealed,
          artworkUrl: concealed ? null : await this.resolveArtwork(definition),
        }),
      );
    }
    const refreshedWallet = await this.getWallet(usuario_id);
    return {
      summary: buildTrailSummary({
        nodes,
        wallet: refreshedWallet,
        level: metrics.level,
      }),
      metrics,
      nodes,
    };
  }

  async getRecent(usuario_id: number, limit = 3) {
    const trail = await this.getTrail(usuario_id);
    return {
      summary: trail.summary,
      nodes: trail.nodes
        .filter((node) => node.status === 'unlocked')
        .sort(
          (a, b) =>
            (b.unlockedAt?.getTime() ?? 0) - (a.unlockedAt?.getTime() ?? 0) ||
            b.id - a.id,
        )
        .slice(0, Math.max(1, Math.min(3, limit))),
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
      equipped: buildEquippedList(owned),
      items: buildShopItems({
        items,
        ownedByItem,
        unlockedSlugs,
        prestigeBalance: trail.summary.prestigeBalance,
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
      await executeCosmeticPurchase(manager, { usuario_id, item });
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
