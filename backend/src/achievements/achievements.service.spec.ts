import { Achievement } from './entities/achievement.entity';
import { Usuario } from '../usuario/usuario.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { UsuarioChallenge } from '../usuario-challenge/usuario-challenge.entity';
import { UsuarioAula } from '../conteudo/usuario-aula/usuario-aula.entity';
import { UsuarioArcadeStats } from '../arcade/entities/usuario-arcade-stats.entity';
import { UsuarioAchievement } from './entities/usuario-achievement.entity';
import { AchievementRequirement } from './entities/achievement.entity';
import { AchievementsService } from './achievements.service';
import { CosmeticType } from './entities/cosmetic-item.entity';
import { PrestigeTransaction } from './entities/prestige-transaction.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';

const repository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  count: jest.fn(),
  create: jest.fn((value: unknown) => value),
  save: jest.fn((value: unknown) => Promise.resolve(value)),
});

describe('AchievementsService', () => {
  it('Nest propaga erro de conquista para permitir retry do produtor', async () => {
    const service = new AchievementsService(
      {} as never,
      {} as never,
      {} as never,
    );
    jest
      .spyOn(service, 'getTrail')
      .mockRejectedValue(new Error('fixture ledger unavailable'));
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [{ provide: AchievementsService, useValue: service }],
    }).compile();
    await module.init();
    try {
      await expect(
        module
          .get(EventEmitter2)
          .emitAsync('progress.changed', { usuarioId: 7 }),
      ).rejects.toThrow('fixture ledger unavailable');
    } finally {
      await module.close();
    }
  });
  it('sincroniza progresso e concede Prestígio retroativo sem mocks na aplicação', async () => {
    const achievements = repository();
    const userAchievements = repository();
    const cosmetics = repository();
    const userCosmetics = repository();
    const wallets = repository();
    const transactions = repository();
    const stats = repository();
    const challenges = repository();
    const lessons = repository();
    const arcade = repository();
    const wallet = { usuario_id: 7, balance: 0, total_earned: 0 };

    achievements.find.mockResolvedValue([
      {
        id: 1,
        slug: 'elite-nivel-dois',
        name: 'Nova patente',
        description: 'Alcance o nível 2.',
        category: 'elite',
        rarity: 'common',
        requirement_type: AchievementRequirement.LEVEL,
        requirement_value: 2,
        tier: 1,
        icon: 'chevrons-up',
        reward_prestige: 1,
        prerequisite_slug: null,
        position_x: 0,
        position_y: 0,
        secret: false,
      },
    ]);
    userAchievements.find.mockResolvedValue([]);
    wallets.findOneOrFail.mockImplementation(() => Promise.resolve(wallet));
    transactions.findOne.mockResolvedValue(null);
    stats.findOne.mockResolvedValue({ total_points: 1000, current_streak: 1 });
    challenges.count.mockResolvedValue(0);
    lessons.count.mockResolvedValue(0);
    arcade.find.mockResolvedValue([]);

    const service = new AchievementsService(
      cosmetics as never,
      userCosmetics as never,
      {
        transaction: (callback: (manager: unknown) => unknown) =>
          callback({
            query: jest.fn().mockResolvedValue([]),
            getRepository: (entity: unknown) =>
              new Map<unknown, unknown>([
                [
                  Usuario,
                  { findOneOrFail: jest.fn().mockResolvedValue({ id: 7 }) },
                ],
                [Achievement, achievements],
                [UsuarioAchievement, userAchievements],
                [PrestigeWallet, wallets],
                [PrestigeTransaction, transactions],
                [UsuarioStats, stats],
                [UsuarioChallenge, challenges],
                [UsuarioAula, lessons],
                [UsuarioArcadeStats, arcade],
              ]).get(entity),
          }),
      } as never,
    );

    const result = await service.getTrail(7);

    expect(result.summary.level).toBe(2);
    expect(result.summary.unlocked).toBe(1);
    expect(result.summary.prestigeBalance).toBe(2);
    expect(result.nodes[0].status).toBe('unlocked');
    expect(transactions.save).toHaveBeenCalledTimes(2);
  });

  it('equipa automaticamente o cosmético adquirido e substitui o item do mesmo tipo', async () => {
    const cosmetics = repository();
    const userCosmetics = repository();
    const transactionWallets = repository();
    const transactionCosmetics = repository();
    const transactionEntries = repository();
    const previousFrame = {
      id: 2,
      usuario_id: 7,
      cosmetic_item: { type: CosmeticType.FRAME },
      equipped: true,
    };
    const item = {
      id: 10,
      slug: 'moldura-violeta',
      name: 'Moldura Violeta',
      type: CosmeticType.FRAME,
      price: 2,
      required_achievement_slug: null,
      active: true,
    };
    cosmetics.findOne.mockResolvedValue(item);
    transactionCosmetics.findOne.mockResolvedValue(null);
    transactionCosmetics.find.mockResolvedValue([previousFrame]);
    transactionWallets.findOneOrFail.mockResolvedValue({
      usuario_id: 7,
      balance: 10,
      total_earned: 10,
    });
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn((entity) => {
        if (entity === Usuario)
          return { findOneOrFail: jest.fn().mockResolvedValue({ id: 7 }) };
        if (entity === PrestigeWallet) return transactionWallets;
        if (entity === UsuarioCosmetic) return transactionCosmetics;
        if (entity === PrestigeTransaction) return transactionEntries;
        throw new Error('Repositório inesperado');
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        (callback: (value: typeof manager) => Promise<void>) =>
          callback(manager),
      ),
    };
    const service = new AchievementsService(
      cosmetics as never,
      userCosmetics as never,
      dataSource as never,
    );
    jest.spyOn(service, 'getTrail').mockResolvedValue({
      summary: {
        unlocked: 0,
        total: 0,
        progressPercent: 0,
        prestigeBalance: 10,
        prestigeEarned: 10,
        level: 1,
      },
      metrics: {} as never,
      nodes: [],
    });
    jest.spyOn(service, 'getShop').mockResolvedValue({} as never);

    await service.purchase(7, item.id);

    expect(previousFrame.equipped).toBe(false);
    expect(transactionCosmetics.create).toHaveBeenCalledWith({
      usuario_id: 7,
      cosmetic_item_id: item.id,
      equipped: true,
    });
    expect(transactionCosmetics.save).toHaveBeenCalledWith(
      expect.objectContaining({ equipped: true }),
    );
  });
});
