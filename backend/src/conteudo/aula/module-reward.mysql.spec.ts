import {
  arcadeFixture,
  openArcadeRedis,
} from '../../../test/fixtures/arcade-fixture';
import { Usuario } from '../../usuario/usuario.entity';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';
import { UsuarioAula } from '../usuario-aula/usuario-aula.entity';
import { Modulo } from '../modulo/modulo.entity';
import { ModuloService } from '../modulo/modulo.service';
import { Aula, AulaType } from './aula.entity';
import { AulaQuiz } from '../aula-quiz/aula-quiz.entity';
import { AulaService } from './aula.service';
import { ActivityCompletion } from '../../common/gamification/activity-completion.entity';
import { Notification } from '../../notification/notification.entity';
import { LegacyModuleRewardClaims1793491200000 } from '../../database/migrations/1793491200000-legacy-module-reward-claims';

const isolated =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;
isolated('C10 — claim de bônus por módulo e baseline legado', () => {
  let f: Awaited<ReturnType<typeof arcadeFixture>>;
  let service: AulaService;
  let user: Usuario;
  let module: Modulo;
  let first: Aula;
  let second: Aula;
  const points = async () =>
    (
      await f.source
        .getRepository(UsuarioStats)
        .findOneBy({ usuario_id: user.id })
    )?.total_points ?? 0;
  const claim = () =>
    f.source.getRepository(ActivityCompletion).findOneBy({
      usuario_id: user.id,
      activity_type: 'module',
      activity_id: module.id,
    });
  const migrate = async (down = false) => {
    const runner = f.source.createQueryRunner();
    try {
      await new LegacyModuleRewardClaims1793491200000()[down ? 'down' : 'up'](
        runner,
      );
    } finally {
      await runner.release();
    }
  };
  const nextLesson = () =>
    f.source.getRepository(Aula).save({
      modulo_id: module.id,
      title: 'Aula adicionada',
      type: AulaType.VIDEO,
      order: 3,
      xp: 50,
    });
  beforeAll(async () => {
    f = await arcadeFixture();
    const modules = new ModuloService(
      f.source.getRepository(Modulo),
      f.source.getRepository(Aula),
      f.source.getRepository(UsuarioAula),
    );
    service = new AulaService(
      f.source.getRepository(Aula),
      f.source.getRepository(AulaQuiz),
      f.source.getRepository(UsuarioAula),
      f.source.getRepository(Modulo),
      {} as never,
      modules,
      f.completions,
    );
  }, 60_000);
  beforeEach(async () => {
    user = await f.source
      .getRepository(Usuario)
      .save({ name: 'Módulo Fixture', password: 'fixture-unused' });
    module = await f.source.getRepository(Modulo).save({
      title: 'Módulo Fixture',
      description: 'Fixture',
      category: 'Fixture',
      learning_path: `fixture-${user.id}`,
      xp_bonus: 25,
    });
    first = await f.source.getRepository(Aula).save({
      modulo_id: module.id,
      title: 'A',
      type: AulaType.VIDEO,
      order: 1,
      xp: 50,
    });
    second = await f.source.getRepository(Aula).save({
      modulo_id: module.id,
      title: 'B',
      type: AulaType.VIDEO,
      order: 2,
      xp: 50,
    });
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await f.source.query('DROP TRIGGER IF EXISTS module_failure');
  });
  afterAll(async () => {
    f?.redis.onModuleDestroy();
    await f?.source.destroy();
  });

  it('migração sem claims admite rollback vazio e reaplicação', async () => {
    await migrate();
    await migrate(true);
    await migrate();
    expect(await claim()).toBeNull();
  });

  it('A confirma antes de B desbloqueada, mas entrega tardia de A não repete o bônus', async () => {
    let release!: () => void;
    let committed!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const observed = new Promise<void>((resolve) => {
      committed = resolve;
    });
    const original = await openArcadeRedis();
    jest
      .spyOn(f.redis, 'applyActivityCompletion')
      .mockImplementation(async (record) => {
        if (
          record.activity_type === 'lesson' &&
          record.activity_id === first.id
        ) {
          committed();
          await gate;
        }
        await original.applyActivityCompletion(record);
      });
    const pending = service.concluir(first.id, user.id);
    try {
      await observed;
      await service.concluir(second.id, user.id);
    } finally {
      release();
      await pending;
      original.onModuleDestroy();
    }
    expect(await points()).toBe(125);
    expect((await claim())?.result).toEqual({ xp: 25 });
    expect(
      await f.source
        .getRepository(Notification)
        .countBy({ usuario_id: user.id }),
    ).toBe(1);
  });

  it('aula B não pode pular desbloqueio mesmo sob concorrência de requests', async () => {
    await expect(service.concluir(second.id, user.id)).rejects.toThrow(
      'Aula anterior',
    );
    expect(await points()).toBe(0);
    expect(await claim()).toBeNull();
  });

  it('edição de bônus e novas aulas não reabrem claim já confirmado', async () => {
    await service.concluir(first.id, user.id);
    await service.concluir(second.id, user.id);
    await f.source.getRepository(Modulo).update(module.id, { xp_bonus: 999 });
    const third = await nextLesson();
    await service.concluir(third.id, user.id);
    expect(await points()).toBe(175);
    expect((await claim())?.result).toEqual({ xp: 25 });
  });

  it('módulo completo legado ganha somente marcador neutro, sem alterar XP', async () => {
    await f.source
      .getRepository(UsuarioStats)
      .save({ usuario_id: user.id, total_points: 200 });
    await f.source.getRepository(UsuarioAula).save(
      [first, second].map((lesson) => ({
        usuario_id: user.id,
        aula_id: lesson.id,
        completed: true,
      })),
    );
    await migrate();
    await migrate();
    expect(await points()).toBe(200);
    expect((await claim())?.result).toMatchObject({
      xp: 0,
      policy: 'legacy-complete-at-cutover',
    });
    await f.source.getRepository(Modulo).update(module.id, { xp_bonus: 999 });
    await service.concluir((await nextLesson()).id, user.id);
    expect(await points()).toBe(250);
    await expect(migrate(true)).rejects.toThrow('Rollback bloqueado');
  });

  it('baseline não bloqueia bônus de módulo legado ainda parcial', async () => {
    await f.source
      .getRepository(UsuarioStats)
      .save({ usuario_id: user.id, total_points: 50 });
    await f.source
      .getRepository(UsuarioAula)
      .save({ usuario_id: user.id, aula_id: first.id, completed: true });
    await migrate();
    expect(await claim()).toBeNull();
    await service.concluir(second.id, user.id);
    expect(await points()).toBe(125);
  });

  it('reaplicar baseline mantém claim novo e seu resultado original', async () => {
    await service.concluir(first.id, user.id);
    await service.concluir(second.id, user.id);
    const before = await claim();
    await migrate();
    expect(await claim()).toEqual(before);
    expect(await points()).toBe(125);
  });

  it('falha de notificação reverte aula, claim e XP antes do retry', async () => {
    await service.concluir(first.id, user.id);
    await f.source.query(
      "CREATE TRIGGER module_failure BEFORE INSERT ON notification FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fixture module failure'",
    );
    await expect(service.concluir(second.id, user.id)).rejects.toThrow(
      'fixture module failure',
    );
    expect(await claim()).toBeNull();
    expect(await points()).toBe(50);
    await f.source.query('DROP TRIGGER module_failure');
    await service.concluir(second.id, user.id);
    expect(await points()).toBe(125);
  });
});
