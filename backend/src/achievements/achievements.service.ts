import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Achievement } from './entities/achievement.entity';
import { UsuarioAchievement } from './entities/usuario-achievement.entity';
import { CosmeticItem, CosmeticType } from './entities/cosmetic-item.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { UsuarioCosmeticKit } from './entities/usuario-cosmetic-kit.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import {
  PrestigeTransaction,
  PrestigeTransactionType,
} from './entities/prestige-transaction.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { UsuarioChallenge } from '../usuario-challenge/usuario-challenge.entity';
import { UsuarioAula } from '../conteudo/usuario-aula/usuario-aula.entity';
import { UsuarioArcadeStats } from '../arcade/entities/usuario-arcade-stats.entity';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  emitirNovidades,
  novidadesVazias,
} from './achievement-events';
import {
  AchievementMetrics,
  AchievementTrailNode,
  AchievementTrailResponse,
} from './achievements.types';
import { buildMetrics, metricValue } from './achievement-metrics';
import { buildTrailNode, buildTrailSummary } from './achievement-trail.mapper';
import { acceptsCosmeticColor } from './cosmetic-shop.mapper';
import { buildShopView } from './cosmetic-shop.view';
import { executeCosmeticPurchase } from './cosmetic-purchase';
import { executeKitPurchase } from './kit-purchase';
import { lockPrestigeWallet } from './prestige-ledger';
import { isOnSale } from './availability';
import { UnlockFactsLoader } from './unlock-evaluator';
import { assertUnlocked } from './unlock-requirements';
import { COSMETIC_COLOR_PATTERN } from './dto/equip-cosmetic.dto';
import { CHARACTER_COLORS, isCharacterColor } from './character-color';
import { Usuario } from '../usuario/usuario.entity';
import { S3Service } from '../conteudo/s3/s3.service';

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
    @Inject('COSMETIC_ITEM_REPOSITORY')
    private cosmeticRepository: Repository<CosmeticItem>,
    @Inject('USUARIO_COSMETIC_REPOSITORY')
    private usuarioCosmeticRepository: Repository<UsuarioCosmetic>,
    @Inject('DATA_SOURCE')
    private dataSource: DataSource,
    @Optional() private readonly events?: EventEmitter2,
    private readonly unlockFacts?: UnlockFactsLoader,
    private readonly s3?: S3Service,
  ) {}

  private readonly logger = new Logger(AchievementsService.name);

  @OnEvent('progress.changed', { suppressErrors: false })
  async synchronizeProgress(payload: { usuarioId: number }): Promise<void> {
    await this.getTrail(payload.usuarioId);
  }

  private resolveArtwork(definition: Achievement): string | null {
    const source = definition.image_url?.trim();
    return source && !source.startsWith('s3://') ? source : null;
  }

  private async addTransaction(
    manager: EntityManager,
    wallet: PrestigeWallet,
    amount: number,
    type: PrestigeTransactionType,
    source_key: string,
    description: string,
    knownKeys?: Set<string>,
  ): Promise<boolean> {
    const transactionRepository = manager.getRepository(PrestigeTransaction);
    // Com `knownKeys` (carregadas numa consulta só) evita um SELECT por lançamento.
    const existing = knownKeys
      ? knownKeys.has(source_key)
      : await transactionRepository.findOne({
          where: { usuario_id: wallet.usuario_id, source_key },
        });
    if (existing) return false;
    if (!Number.isSafeInteger(amount) || amount < 0)
      throw new Error('Recompensa de Prestígio inválida');
    const transaction = transactionRepository.create({
      usuario_id: wallet.usuario_id,
      amount,
      type,
      source_key,
      description,
    });
    await transactionRepository.save(transaction);
    wallet.balance += amount;
    if (amount > 0) wallet.total_earned += amount;
    await manager.getRepository(PrestigeWallet).save(wallet);
    knownKeys?.add(source_key);
    return true;
  }

  private async getMetrics(
    usuario_id: number,
    manager: EntityManager,
  ): Promise<AchievementMetrics> {
    const [stats, challenges, lessons, arcade] = await Promise.all([
      manager.getRepository(UsuarioStats).findOne({ where: { usuario_id } }),
      manager.getRepository(UsuarioChallenge).count({
        where: { usuario_id, completed: true },
      }),
      manager.getRepository(UsuarioAula).count({
        where: { usuario_id, completed: true },
      }),
      manager.getRepository(UsuarioArcadeStats).find({ where: { usuario_id } }),
    ]);
    return buildMetrics({
      stats,
      challenges_completed: challenges,
      lessons_completed: lessons,
      arcade,
    });
  }

  private async grantLevelPrestige(
    manager: EntityManager,
    wallet: PrestigeWallet,
    level: number,
    knownKeys?: Set<string>,
  ): Promise<number[]> {
    const concedidos: number[] = [];
    for (let currentLevel = 1; currentLevel <= level; currentLevel += 1) {
      const concedido = await this.addTransaction(
        manager,
        wallet,
        1,
        PrestigeTransactionType.LEVEL,
        // Preserva a chave histórica do mesmo marco de XP, evitando regrants.
        `level:${currentLevel + 1}`,
        `Chaves Digitais recebidas ao alcançar o nível ${currentLevel}`,
        knownKeys,
      );
      // O nível inicial (1) não é uma conquista para anunciar.
      if (concedido && currentLevel > 1) concedidos.push(currentLevel);
    }
    return concedidos;
  }

  /**
   * Caminho de leitura: quando nada precisa ser gravado (caso comum depois da
   * primeira abertura), responde sem transação nem lock — são só consultas em
   * paralelo, sem BEGIN/lock/COMMIT nem um save por conquista. Devolve null se
   * houver qualquer gravação pendente; aí vale o caminho transacional.
   */
  private async getTrailReadOnly(
    usuario_id: number,
  ): Promise<AchievementTrailResponse | null> {
    const manager = this.dataSource.manager;
    const [wallet, definitions, metrics, records, ledger] = await Promise.all([
      manager.getRepository(PrestigeWallet).findOne({ where: { usuario_id } }),
      manager.getRepository(Achievement).find({
        where: { active: true },
        order: { order_index: 'ASC', tier: 'ASC' },
      }),
      this.getMetrics(usuario_id, manager),
      manager.getRepository(UsuarioAchievement).find({ where: { usuario_id } }),
      manager.getRepository(PrestigeTransaction).find({
        where: { usuario_id },
        select: { source_key: true },
      }),
    ]);
    if (!wallet) return null;
    const knownKeys = new Set((ledger ?? []).map((entry) => entry.source_key));
    for (let level = 1; level <= metrics.level; level += 1) {
      if (!knownKeys.has(`level:${level + 1}`)) return null;
    }
    const recordsByAchievement = new Map(
      records.map((record) => [record.achievement_id, record]),
    );
    const unlockedSlugs = new Set<string>();
    const nodes: AchievementTrailNode[] = [];
    for (const definition of definitions) {
      const record = recordsByAchievement.get(definition.id);
      if (!record) return null;
      const prerequisiteMet =
        !definition.prerequisite_slug ||
        unlockedSlugs.has(definition.prerequisite_slug);
      const metric = metricValue(metrics, definition.requirement_type);
      const progress = record.unlocked
        ? definition.requirement_value
        : Math.min(metric, definition.requirement_value);
      const shouldUnlock =
        prerequisiteMet && metric >= definition.requirement_value;
      if (record.progress !== progress) return null;
      if (shouldUnlock && !record.unlocked) return null;
      if (record.unlocked) {
        if (!knownKeys.has(`achievement:${definition.slug}`)) return null;
        unlockedSlugs.add(definition.slug);
      }
      const concealed = definition.secret && !record.unlocked;
      nodes.push(
        buildTrailNode({
          definition,
          record,
          prerequisiteMet,
          concealed,
          artworkUrl: concealed ? null : this.resolveArtwork(definition),
        }),
      );
    }
    return {
      summary: buildTrailSummary({ nodes, wallet, level: metrics.level }),
      metrics,
      nodes,
    };
  }

  async getTrail(usuario_id: number): Promise<AchievementTrailResponse> {
    const fast = await this.getTrailReadOnly(usuario_id);
    if (fast) return fast;
    const novidades = novidadesVazias();
    const trail = await this.dataSource.transaction(async (manager) => {
      const wallet = await lockPrestigeWallet(manager, usuario_id);
      const userAchievements = manager.getRepository(UsuarioAchievement);
      const [definitions, metrics] = await Promise.all([
        manager.getRepository(Achievement).find({
          where: { active: true },
          order: { order_index: 'ASC', tier: 'ASC' },
        }),
        this.getMetrics(usuario_id, manager),
      ]);
      const [records, ledger] = await Promise.all([
        userAchievements.find({ where: { usuario_id } }),
        manager.getRepository(PrestigeTransaction).find({
          where: { usuario_id },
          select: { source_key: true },
        }),
      ]);
      // Uma consulta traz todas as chaves já lançadas; sem isso eram ~1 SELECT por conquista e por nível.
      const knownKeys = new Set((ledger ?? []).map((entry) => entry.source_key));
      // Em retry da transação o que sobrou da tentativa anterior não vale.
      novidades.conquistas.length = 0;
      novidades.niveis = await this.grantLevelPrestige(
        manager,
        wallet,
        metrics.level,
        knownKeys,
      );
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
        const progress = record?.unlocked
          ? definition.requirement_value
          : Math.min(metric, definition.requirement_value);
        const shouldUnlock =
          prerequisiteMet && metric >= definition.requirement_value;
        let changed = false;
        const wasUnlocked = record?.unlocked ?? false;
        if (!record) {
          changed = true;
          record = userAchievements.create({
            usuario_id,
            achievement_id: definition.id,
            progress,
            unlocked: shouldUnlock,
            unlocked_at: shouldUnlock ? new Date() : null,
          });
        } else {
          if (record.progress !== progress) {
            record.progress = progress;
            changed = true;
          }
          if (shouldUnlock && !record.unlocked) {
            record.unlocked = true;
            record.unlocked_at = new Date();
            changed = true;
          }
        }
        // Só grava o que mudou: a leitura da trilha não deve reescrever 20 linhas a cada abertura.
        if (changed) await userAchievements.save(record);
        if (shouldUnlock && changed && record.unlocked && !wasUnlocked)
          novidades.conquistas.push({
            id: definition.id,
            titulo: definition.name,
          });
        if (record.unlocked) unlockedSlugs.add(definition.slug);
        // Um unlock legado sem lançamento também pode completar sua recompensa.
        if (record.unlocked) {
          await this.addTransaction(
            manager,
            wallet,
            definition.reward_prestige,
            PrestigeTransactionType.ACHIEVEMENT,
            `achievement:${definition.slug}`,
            `Conquista desbloqueada: ${definition.name}`,
            knownKeys,
          );
        }
        const concealed = definition.secret && !record.unlocked;
        nodes.push(
          buildTrailNode({
            definition,
            record,
            prerequisiteMet,
            concealed,
            artworkUrl: concealed ? null : this.resolveArtwork(definition),
          }),
        );
      }
      return {
        summary: buildTrailSummary({
          nodes,
          wallet,
          level: metrics.level,
        }),
        metrics,
        nodes,
      };
    });
    // Só depois do commit: se a transação desfez, nada é anunciado.
    emitirNovidades(this.events, usuario_id, novidades);
    return trail;
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
    return buildShopView({
      usuario_id,
      prestigeBalance: trail.summary.prestigeBalance,
      items: this.cosmeticRepository,
      userItems: this.usuarioCosmeticRepository,
      kits: this.dataSource.getRepository(CosmeticKit),
      userKits: this.dataSource.getRepository(UsuarioCosmeticKit),
      users: this.dataSource.getRepository(Usuario),
      unlockFacts: this.unlockFacts,
      s3: this.s3,
      logger: this.logger,
    });
  }

  /** Grava a cor base do personagem (gratuita); o servidor só aceita as cores da lista. */
  async setCharacterColor(usuario_id: number, color: unknown) {
    if (!isCharacterColor(color))
      throw new BadRequestException(
        `A cor deve ser uma de: ${CHARACTER_COLORS.join(', ')}`,
      );
    await this.dataSource
      .getRepository(Usuario)
      .update({ id: usuario_id }, { character_color: color });
    return this.getShop(usuario_id);
  }

  async purchase(usuario_id: number, itemId: number) {
    const item = await this.cosmeticRepository.findOne({
      where: { id: itemId, active: true },
    });
    if (!item) throw new NotFoundException('Item cosmético não encontrado');
    if (item.kit_id) {
      throw new BadRequestException('Esta peça só vem com o kit');
    }
    if (!isOnSale(item)) {
      throw new BadRequestException('Este item não está mais à venda');
    }
    // Sincroniza as conquistas antes de a regra consultá-las.
    await this.getTrail(usuario_id);
    await assertUnlocked(this.unlockFacts, usuario_id, item);
    await this.dataSource.transaction(async (manager) => {
      await executeCosmeticPurchase(manager, { usuario_id, itemId: item.id });
    });
    return this.getShop(usuario_id);
  }

  async purchaseKit(usuario_id: number, kitId: number) {
    const kit = await this.dataSource.getRepository(CosmeticKit).findOne({
      where: { id: kitId, active: true },
      relations: { pieces: true },
    });
    if (!kit) throw new NotFoundException('Kit não encontrado');
    if (!isOnSale(kit)) {
      throw new BadRequestException('Este kit não está mais à venda');
    }
    const pieces = kit.pieces.filter((piece) => piece.active);
    if (pieces.length === 0) {
      throw new BadRequestException('Este kit não tem peças disponíveis');
    }
    await this.getTrail(usuario_id);
    await assertUnlocked(this.unlockFacts, usuario_id, kit);
    await this.dataSource.transaction(async (manager) => {
      await executeKitPurchase(manager, { usuario_id, kitId: kit.id });
    });
    return this.getShop(usuario_id);
  }

  async equip(usuario_id: number, itemId: number, color?: string | null) {
    if (typeof color === 'string' && !COSMETIC_COLOR_PATTERN.test(color)) {
      throw new BadRequestException('A cor deve estar no formato #RRGGBB');
    }
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
    for (const item of sameType) {
      item.equipped = item.id === selected.id;
      // Sem cor no pedido, mantém a já guardada; item que não aceita cor fica sem ela.
      if (item.id === selected.id && color !== undefined) {
        const accepts = acceptsCosmeticColor(selected.cosmetic_item);
        item.color = accepts ? color : null;
      }
    }
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
