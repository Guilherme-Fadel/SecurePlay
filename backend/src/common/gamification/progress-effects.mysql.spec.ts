import {
  arcadeFixture,
  listenProgress,
} from '../../../test/fixtures/arcade-fixture';
import { ActivityCompletion } from './activity-completion.entity';
import { DailyCheckinService } from '../../dashboard/daily-checkin.service';
import { DailyCheckin } from '../../dashboard/daily-checkin.entity';
import { AchievementsService } from '../../achievements/achievements.service';
import {
  Achievement,
  AchievementCategory,
  AchievementRarity,
  AchievementRequirement,
} from '../../achievements/entities/achievement.entity';
import { PrestigeWallet } from '../../achievements/entities/prestige-wallet.entity';
import { PrestigeTransaction } from '../../achievements/entities/prestige-transaction.entity';
import { CosmeticItem } from '../../achievements/entities/cosmetic-item.entity';
import { UsuarioCosmetic } from '../../achievements/entities/usuario-cosmetic.entity';
import { Usuario } from '../../usuario/usuario.entity';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';

const isolated =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;
isolated('C07/C08 — outbox de atividade, check-in e conquistas', () => {
  let f: Awaited<ReturnType<typeof arcadeFixture>>;
  let user: Usuario;
  const complete = () =>
    f.completions.complete(user.id, 'lesson', 1, () =>
      Promise.resolve({
        result: { done: true },
        xp: 1,
      }),
    );
  beforeAll(async () => {
    f = await arcadeFixture();
    await f.source.getRepository(Achievement).save({
      slug: 'fixture-xp',
      name: 'Mil XP',
      description: 'Fixture',
      category: AchievementCategory.ELITE,
      rarity: AchievementRarity.COMMON,
      requirement_type: AchievementRequirement.TOTAL_XP,
      requirement_value: 1000,
      reward_prestige: 2,
      icon: 'star',
    });
  }, 60_000);
  beforeEach(async () => {
    user = await f.source
      .getRepository(Usuario)
      .save({ name: 'Efeitos Fixture', password: 'fixture-unused' });
    f.events.removeAllListeners();
    const checkin = new DailyCheckinService(
      f.source,
      f.completions,
      f.tokens,
      f.redis,
    );
    const achievements = new AchievementsService(
      f.source.getRepository(CosmeticItem),
      f.source.getRepository(UsuarioCosmetic),
      f.source,
    );
    listenProgress(
      f.events,
      async (payload: { usuarioId: number; skipCheckin?: boolean }) => {
        if (!payload.skipCheckin) await checkin.register(payload.usuarioId);
      },
    );
    listenProgress(f.events, (payload) =>
      achievements.synchronizeProgress(payload),
    );
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- emitAsync aguarda o efeito
    f.events.on('checkin.effects', (record: ActivityCompletion) =>
      checkin.applyEffects(record),
    );
  });
  afterEach(async () => {
    await f.source.query('DROP TRIGGER IF EXISTS progress_failure');
  });
  afterAll(async () => {
    f?.redis.onModuleDestroy();
    await f?.source.destroy();
  });

  it('bônus gera nova conquista sem ciclo, sem duplicar saldo/XP/refill', async () => {
    await f.source
      .getRepository(UsuarioStats)
      .save({ usuario_id: user.id, total_points: 997 });
    await f.tokens.consume(user.id);
    await complete();
    await f.completions.flushPending();
    const stats = await f.source
      .getRepository(UsuarioStats)
      .findOneByOrFail({ usuario_id: user.id });
    expect(stats.total_points).toBe(1003);
    expect(
      await f.source
        .getRepository(ActivityCompletion)
        .countBy({ usuario_id: user.id }),
    ).toBe(2);
    expect(
      await f.source
        .getRepository(DailyCheckin)
        .countBy({ usuario_id: user.id }),
    ).toBe(1);
    expect(
      (
        await f.source
          .getRepository(PrestigeWallet)
          .findOneByOrFail({ usuario_id: user.id })
      ).balance,
    ).toBe(3);
    await f.tokens.consume(user.id);
    await complete();
    await f.completions.flushPending();
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
    expect(
      await f.source
        .getRepository(PrestigeTransaction)
        .countBy({ usuario_id: user.id }),
    ).toBe(2);
  });

  it('erro SQL no check-in mantém produtor pendente e worker recupera sem duplicar atividade', async () => {
    await f.source.query(
      "CREATE TRIGGER progress_failure BEFORE INSERT ON daily_checkin FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fixture checkin unavailable'",
    );
    expect(await complete()).toEqual({ done: true });
    const repository = f.source.getRepository(ActivityCompletion);
    expect(
      (
        await repository.findOneByOrFail({
          usuario_id: user.id,
          activity_type: 'lesson',
        })
      ).effects_processed,
    ).toBe(false);
    await f.source.query('DROP TRIGGER progress_failure');
    await f.completions.flushPending();
    expect(
      (
        await f.source
          .getRepository(UsuarioStats)
          .findOneByOrFail({ usuario_id: user.id })
      ).total_points,
    ).toBe(6);
    expect(
      (
        await repository.findOneByOrFail({
          usuario_id: user.id,
          activity_type: 'lesson',
        })
      ).effects_processed,
    ).toBe(true);
    await complete();
    expect(
      (
        await f.source
          .getRepository(UsuarioStats)
          .findOneByOrFail({ usuario_id: user.id })
      ).total_points,
    ).toBe(6);
  });
});
