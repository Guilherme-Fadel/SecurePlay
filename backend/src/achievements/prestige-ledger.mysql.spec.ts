import { arcadeFixture } from '../../test/fixtures/arcade-fixture';
import { AchievementsService } from './achievements.service';
import {
  Achievement,
  AchievementCategory,
  AchievementRarity,
  AchievementRequirement,
} from './entities/achievement.entity';
import { UsuarioAchievement } from './entities/usuario-achievement.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import {
  PrestigeTransaction,
  PrestigeTransactionType,
} from './entities/prestige-transaction.entity';
import { CosmeticItem, CosmeticType } from './entities/cosmetic-item.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { Usuario } from '../usuario/usuario.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import {
  inspectPrestigeWallet,
  reconcilePrestigeWallet,
} from './prestige-ledger';

const isolated =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;
isolated('C08 — ledger, conquistas e carteira transacionais', () => {
  let f: Awaited<ReturnType<typeof arcadeFixture>>;
  let service: AchievementsService;
  let user: Usuario;
  let definition: Achievement;
  const makeService = () =>
    new AchievementsService(
      f.source.getRepository(CosmeticItem),
      f.source.getRepository(UsuarioCosmetic),
      f.source,
    );
  const wallet = () =>
    f.source
      .getRepository(PrestigeWallet)
      .findOneByOrFail({ usuario_id: user.id });
  const entry = (
    amount: number,
    key: string,
    type = PrestigeTransactionType.ADJUSTMENT,
  ) =>
    f.source.getRepository(PrestigeTransaction).save({
      usuario_id: user.id,
      amount,
      type,
      source_key: key,
      description: 'Fixture',
    });
  beforeAll(async () => {
    f = await arcadeFixture();
    definition = await f.source.getRepository(Achievement).save({
      slug: 'fixture-primeiro-xp',
      name: 'Primeiro XP',
      description: 'Fixture',
      category: AchievementCategory.ELITE,
      rarity: AchievementRarity.COMMON,
      requirement_type: AchievementRequirement.TOTAL_XP,
      requirement_value: 1,
      reward_prestige: 3,
      icon: 'star',
    });
  }, 60_000);
  beforeEach(async () => {
    service = makeService();
    user = await f.source
      .getRepository(Usuario)
      .save({ name: 'Carteira Fixture', password: 'fixture-unused' });
    await f.source
      .getRepository(UsuarioStats)
      .save({ usuario_id: user.id, total_points: 1000 });
  });
  afterEach(async () => {
    await f.source.query('DROP TRIGGER IF EXISTS prestige_failure');
  });
  afterAll(async () => {
    f?.redis.onModuleDestroy();
    await f?.source.destroy();
  });

  it('12 sincronizações em duas instâncias não perdem nem duplicam recompensas', async () => {
    const other = makeService();
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        (index % 2 ? service : other).getTrail(user.id),
      ),
    );
    expect(await wallet()).toMatchObject({ balance: 4, total_earned: 4 });
    expect(
      await f.source
        .getRepository(PrestigeTransaction)
        .countBy({ usuario_id: user.id }),
    ).toBe(2);
    expect(
      await f.source
        .getRepository(UsuarioAchievement)
        .countBy({ usuario_id: user.id }),
    ).toBe(1);
  });

  it.each(['prestige_transaction', 'prestige_wallet', 'usuario_achievement'])(
    'falha em %s reverte ledger, saldo e unlock juntos',
    async (table) => {
      const operation = table === 'prestige_wallet' ? 'UPDATE' : 'INSERT';
      await f.source.query(
        `CREATE TRIGGER prestige_failure BEFORE ${operation} ON ${table} FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fixture prestige failure'`,
      );
      await expect(service.getTrail(user.id)).rejects.toThrow(
        'fixture prestige failure',
      );
      expect(
        await f.source
          .getRepository(PrestigeTransaction)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
      expect(
        await f.source
          .getRepository(UsuarioAchievement)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
      expect(
        await f.source
          .getRepository(PrestigeWallet)
          .findOneBy({ usuario_id: user.id }),
      ).toBeNull();
      await f.source.query('DROP TRIGGER prestige_failure');
      expect((await service.getTrail(user.id)).summary.prestigeBalance).toBe(4);
    },
  );

  it('unlock legado sem lançamento recebe a recompensa uma vez', async () => {
    await f.source.getRepository(UsuarioAchievement).save({
      usuario_id: user.id,
      achievement_id: definition.id,
      progress: 1,
      unlocked: true,
      unlocked_at: new Date(),
    });
    await service.getTrail(user.id);
    await service.getTrail(user.id);
    expect(await wallet()).toMatchObject({ balance: 4, total_earned: 4 });
  });

  it('ledger legado sem saldo é diagnosticado e corrigido somente por snapshot explícito', async () => {
    await f.source
      .getRepository(PrestigeWallet)
      .save({ usuario_id: user.id, balance: 0, total_earned: 0 });
    await entry(1, 'level:2', PrestigeTransactionType.LEVEL);
    await entry(
      3,
      `achievement:${definition.slug}`,
      PrestigeTransactionType.ACHIEVEMENT,
    );
    await service.getTrail(user.id);
    expect((await wallet()).balance).toBe(0); // Leitura normal não presume saldo antigo.
    const expected = await inspectPrestigeWallet(f.source.manager, user.id);
    expect(expected).toMatchObject({
      balance: 0,
      ledgerBalance: 4,
      ledgerEarned: 4,
      ledgerCount: 2,
    });
    await reconcilePrestigeWallet(f.source, user.id, expected);
    expect(await wallet()).toMatchObject({ balance: 4, total_earned: 4 });
  });

  it('conciliação mantém débitos e ganhos totais separados', async () => {
    await f.source
      .getRepository(PrestigeWallet)
      .save({ usuario_id: user.id, balance: 0, total_earned: 0 });
    await entry(8, 'grant');
    await entry(-3, 'purchase:fixture', PrestigeTransactionType.PURCHASE);
    const expected = await inspectPrestigeWallet(f.source.manager, user.id);
    await reconcilePrestigeWallet(f.source, user.id, expected);
    expect(await wallet()).toMatchObject({ balance: 5, total_earned: 8 });
  });

  it('snapshot desatualizado cancela reparo sem sobrescrever carteira', async () => {
    await f.source
      .getRepository(PrestigeWallet)
      .save({ usuario_id: user.id, balance: 0, total_earned: 0 });
    await entry(3, 'grant');
    const expected = await inspectPrestigeWallet(f.source.manager, user.id);
    await f.source
      .getRepository(PrestigeWallet)
      .update({ usuario_id: user.id }, { balance: 1 });
    await expect(
      reconcilePrestigeWallet(f.source, user.id, expected),
    ).rejects.toThrow('snapshot mudou');
    expect((await wallet()).balance).toBe(1);
  });

  it.each([0, -3])(
    'ledger vazio ou saldo negativo (%i) não autoriza reparo',
    async (amount) => {
      await f.source
        .getRepository(PrestigeWallet)
        .save({ usuario_id: user.id, balance: 7, total_earned: 7 });
      if (amount) await entry(amount, 'invalid');
      const expected = await inspectPrestigeWallet(f.source.manager, user.id);
      await expect(
        reconcilePrestigeWallet(f.source, user.id, expected),
      ).rejects.toThrow('ledger válido');
      expect((await wallet()).balance).toBe(7);
    },
  );

  it('compra concorrente com grants usa a mesma ordem de locks e mantém o saldo', async () => {
    await f.source
      .getRepository(PrestigeWallet)
      .save({ usuario_id: user.id, balance: 10, total_earned: 10 });
    await entry(10, 'opening');
    const item = await f.source.getRepository(CosmeticItem).save({
      slug: `fixture-${user.id}`,
      name: 'Moldura',
      description: 'Fixture',
      rarity: AchievementRarity.COMMON,
      visual_value: 'fixture',
      type: CosmeticType.FRAME,
      price: 2,
    });
    await Promise.all([
      service.getTrail(user.id),
      service.purchase(user.id, item.id),
      makeService().getTrail(user.id),
    ]);
    expect(await wallet()).toMatchObject({ balance: 12, total_earned: 14 });
    expect(
      (await inspectPrestigeWallet(f.source.manager, user.id)).ledgerBalance,
    ).toBe(12);
    expect(
      await f.source
        .getRepository(UsuarioCosmetic)
        .countBy({ usuario_id: user.id }),
    ).toBe(1);
  });

  it('duas compras do mesmo item debitam somente uma vez', async () => {
    await service.getTrail(user.id);
    const item = await f.source.getRepository(CosmeticItem).save({
      slug: `fixture-${user.id}`,
      name: 'Moldura',
      description: 'Fixture',
      rarity: AchievementRarity.COMMON,
      visual_value: 'fixture',
      type: CosmeticType.FRAME,
      price: 2,
    });
    const results = await Promise.allSettled([
      service.purchase(user.id, item.id),
      makeService().purchase(user.id, item.id),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect((await wallet()).balance).toBe(2);
  });

  it('identidades diferentes nunca compartilham carteira ou lançamentos', async () => {
    const other = await f.source
      .getRepository(Usuario)
      .save({ name: 'Outro Fixture', password: 'fixture-unused' });
    await Promise.all([service.getTrail(user.id), service.getTrail(other.id)]);
    expect((await wallet()).balance).toBe(4);
    expect(
      (
        await f.source
          .getRepository(PrestigeWallet)
          .findOneByOrFail({ usuario_id: other.id })
      ).balance,
    ).toBe(0);
  });
});
