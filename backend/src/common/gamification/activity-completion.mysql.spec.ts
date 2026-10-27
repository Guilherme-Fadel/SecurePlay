import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { Empresa } from '../../empresa/empresa.entity';
import { Usuario } from '../../usuario/usuario.entity';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';
import { UsuarioChallenge } from '../../usuario-challenge/usuario-challenge.entity';
import { Challenge } from '../../challenge/challenge.entity';
import { Question } from '../../question/question.entity';
import { ChallengeService } from '../../challenge/challenge.service';
import { Modulo } from '../../conteudo/modulo/modulo.entity';
import { ModuloService } from '../../conteudo/modulo/modulo.service';
import { Aula, AulaType } from '../../conteudo/aula/aula.entity';
import { AulaQuiz } from '../../conteudo/aula-quiz/aula-quiz.entity';
import { AulaService } from '../../conteudo/aula/aula.service';
import { UsuarioAula } from '../../conteudo/usuario-aula/usuario-aula.entity';
import { Notification } from '../../notification/notification.entity';
import { RankingSeasonPoints } from '../../dashboard/ranking-season-points.entity';
import { RankingTracking } from '../../dashboard/ranking-tracking.entity';
import { RankingSeasonClose } from '../../dashboard/ranking-season-close.entity';
import { RankingSeasonSnapshot } from '../../dashboard/ranking-season-snapshot.entity';
import { RedisService } from '../../redis/redis.service';
import { getLocalDateKey } from '../utils/date.utils';
import { getRankingWeekStart } from '../../dashboard/ranking-season';
import { ActivityCompletion } from './activity-completion.entity';
import { ActivityCompletionService } from './activity-completion.service';
import { ActivityCompletion1793232000000 } from '../../database/migrations/1793232000000-activity-completion';
import { DailyCheckin1793404800000 } from '../../database/migrations/1793404800000-daily-checkin';
import { DailyCheckin } from '../../dashboard/daily-checkin.entity';
import { DailyCheckinService } from '../../dashboard/daily-checkin.service';

// Opt-in: somente o Compose descartável C123, sem .env/AppModule ou serviços externos.
const isolated =
  process.env.RUN_ACTIVITY_MYSQL_TESTS === '1' ? describe : describe.skip;
isolated('C01/C02/C03 — MySQL e Redis descartáveis', () => {
  let source: DataSource;
  let redis: RedisService;
  let events: EventEmitter2;
  let completion: ActivityCompletionService;
  let challenges: ChallengeService;
  let lessons: AulaService;
  let user: Usuario;
  let challenge: Challenge;
  let question: Question;
  let lesson: Aula;
  const entities = [
    Empresa,
    Usuario,
    UsuarioStats,
    UsuarioChallenge,
    Challenge,
    Question,
    Modulo,
    Aula,
    AulaQuiz,
    UsuarioAula,
    Notification,
    RankingSeasonPoints,
    RankingTracking,
    RankingSeasonClose,
    RankingSeasonSnapshot,
    ActivityCompletion,
    DailyCheckin,
  ];

  beforeAll(async () => {
    const port = Number(process.env.ACTIVITY_MYSQL_PORT);
    const redisPort = Number(process.env.ACTIVITY_REDIS_PORT);
    if (
      ![port, redisPort].every(
        (value) => Number.isInteger(value) && value >= 1024 && value <= 65535,
      )
    ) {
      throw new Error('Informe portas dos containers descartáveis C123');
    }
    source = await new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port,
      username: 'root',
      password: 'activity-fixture-only',
      database: 'activity_completion_fixture',
      timezone: '-03:00',
      entities,
      synchronize: true,
      logging: false,
      poolSize: 20,
    }).initialize();
    // Não inicia timers de nenhum módulo nem acessa Resend/S3.
    redis = new RedisService(
      new ConfigService({ REDIS_URL: `redis://127.0.0.1:${redisPort}` }),
    );
    redis.onModuleInit();
    await redis.get('fixture-ready');
    events = new EventEmitter2();
    completion = new ActivityCompletionService(source, redis, events);
    challenges = new ChallengeService(
      source.getRepository(Challenge),
      source.getRepository(Question),
      source.getRepository(UsuarioChallenge),
      redis,
      completion,
    );
    const modules = new ModuloService(
      source.getRepository(Modulo),
      source.getRepository(Aula),
      source.getRepository(UsuarioAula),
    );
    lessons = new AulaService(
      source.getRepository(Aula),
      source.getRepository(AulaQuiz),
      source.getRepository(UsuarioAula),
      source.getRepository(Modulo),
      {} as never,
      modules,
      completion,
    );
  }, 60_000);

  beforeEach(async () => {
    user = await source
      .getRepository(Usuario)
      .save({ name: 'Aluno Fixture', password: 'fixture-unused' });
    challenge = await source.getRepository(Challenge).save({
      title: 'Missão Fixture',
      description: 'Fixture',
      duration: 30,
      points: 100,
    });
    question = await source.getRepository(Question).save({
      challenge_id: challenge.id,
      text: 'Verificar?',
      options: ['Sim', 'Não'],
      correct_index: 0,
    });
    const module = await source.getRepository(Modulo).save({
      title: 'Módulo Fixture',
      description: 'Fixture',
      category: 'Fixture',
      learning_path: `fixture-${user.id}`,
      xp_bonus: 25,
    });
    lesson = await source
      .getRepository(Aula)
      .save({ modulo_id: module.id, title: 'Aula Fixture', xp: 50, order: 1 });
    await redis.set(
      `daily-challenge:${user.id}`,
      JSON.stringify(challenge),
      600,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    events?.removeAllListeners();
  });
  afterAll(async () => {
    completion?.onModuleDestroy();
    redis?.onModuleDestroy();
    if (source?.isInitialized) await source.destroy();
  });
  const answers = () => ({
    answers: [{ questionId: question.id, selectedIndex: 0 }],
  });
  const points = async () =>
    (
      await source
        .getRepository(UsuarioStats)
        .findOneBy({ usuario_id: user.id })
    )?.total_points ?? 0;
  const monthlyPoints = async () =>
    (
      await source.getRepository(RankingSeasonPoints).findOneBy({
        usuario_id: user.id,
        season_id: getLocalDateKey().slice(0, 7),
      })
    )?.points ?? 0;

  it('migração bloqueia duplicatas sem apagar registros e suporta up/down/up vazio', async () => {
    const runner = source.createQueryRunner();
    const migration = new ActivityCompletion1793232000000();
    try {
      if (await runner.hasTable('activity_completion'))
        await runner.dropTable('activity_completion');
      const table = await runner.getTable('usuario_challenge');
      if (
        table?.indices.some(
          (index) => index.name === 'ux_usuario_challenge_source',
        )
      ) {
        await runner.dropIndex(
          'usuario_challenge',
          'ux_usuario_challenge_source',
        );
      }
      const repo = source.getRepository(UsuarioChallenge);
      const first = await repo.save({
        usuario_id: user.id,
        challenge_id: challenge.id,
        progress: 55,
      });
      const duplicate = await repo.save({
        usuario_id: user.id,
        challenge_id: challenge.id,
        progress: 20,
      });
      await expect(migration.up(runner)).rejects.toThrow(/duplicadas/);
      expect(await runner.hasTable('activity_completion')).toBe(false);
      expect(await repo.countBy({ usuario_id: user.id })).toBe(2);
      await repo.delete(duplicate.id); // Apenas fixture criada por este teste.
      await migration.up(runner);
      await migration.down(runner);
      await migration.up(runner);
      await new DailyCheckin1793404800000().up(runner);
      expect(await repo.findOneByOrFail({ id: first.id })).toMatchObject({
        progress: 55,
        completed: false,
      });
      expect((await runner.getTable('usuario_challenge'))?.indices).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'ux_usuario_challenge_source',
            isUnique: true,
          }),
        ]),
      );
    } finally {
      await runner.release();
    }
  });

  it('recusa a resposta repetida que antes concedia 1000 XP', async () => {
    await expect(
      challenges.submitChallenge(challenge.id, user.id, {
        answers: Array.from({ length: 10 }, () => ({
          questionId: question.id,
          selectedIndex: 0,
        })),
      }),
    ).rejects.toThrow(/cada pergunta uma vez/);
    expect(await points()).toBe(0);
    expect(
      await source
        .getRepository(UsuarioChallenge)
        .countBy({ usuario_id: user.id }),
    ).toBe(0);
  });

  it('12 submits simultâneos retornam o mesmo resultado e creditam uma única vez', async () => {
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        challenges.submitChallenge(challenge.id, user.id, answers()),
      ),
    );
    for (const result of results) expect(result).toEqual(results[0]);
    expect(results[0].pointsEarned).toBe(100);
    expect(await points()).toBe(105);
    expect(await monthlyPoints()).toBe(105);
    expect(
      await source
        .getRepository(UsuarioChallenge)
        .countBy({ usuario_id: user.id }),
    ).toBe(1);
    expect(await redis.get(`xp-today:${user.id}`)).toBe('105');
    expect(
      await redis.get(
        `ranking:week:${getRankingWeekStart()}:challenges:${user.id}`,
      ),
    ).toBe('1');
  }, 30_000);

  it('falha SQL antes do crédito reverte conclusão e permite tentar de novo', async () => {
    await source.query(`CREATE TRIGGER fixture_monthly_failure BEFORE INSERT ON ranking_season_points
      FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fixture monthly failure'`);
    try {
      await expect(
        challenges.submitChallenge(challenge.id, user.id, answers()),
      ).rejects.toThrow('fixture monthly failure');
      expect(await points()).toBe(0);
      expect(
        await source
          .getRepository(UsuarioChallenge)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
      expect(
        await source
          .getRepository(ActivityCompletion)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
    } finally {
      await source.query('DROP TRIGGER fixture_monthly_failure');
    }
    await expect(
      challenges.submitChallenge(challenge.id, user.id, answers()),
    ).resolves.toMatchObject({ pointsEarned: 100 });
    expect(await points()).toBe(105);
  });

  it('falha no Redis pós-commit mantém resultado e outbox recuperável sem recreditar XP', async () => {
    const spy = jest
      .spyOn(redis, 'applyActivityCompletion')
      .mockRejectedValue(new Error('fixture redis down'));
    const result = await challenges.submitChallenge(
      challenge.id,
      user.id,
      answers(),
    );
    expect(result.pointsEarned).toBe(100);
    expect(await points()).toBe(105);
    expect(
      await source
        .getRepository(ActivityCompletion)
        .findOneBy({ usuario_id: user.id }),
    ).toMatchObject({ effects_processed: false });
    spy.mockRestore();
    await redis.del(`daily-challenge:${user.id}`);
    await expect(
      challenges.submitChallenge(challenge.id, user.id, { answers: [] }),
    ).resolves.toEqual(result);
    expect(await points()).toBe(105);
    await completion.flushPending(); // Recupera também a outbox do bônus de check-in.
    expect(await redis.get(`xp-today:${user.id}`)).toBe('105');
  });

  it('crash após Redis e antes do ack SQL não duplica métricas no reprocessamento', async () => {
    let fail = true;
    events.on('progress.changed', () => {
      if (fail) throw new Error('fixture listener failure');
    });
    const result = await challenges.submitChallenge(
      challenge.id,
      user.id,
      answers(),
    );
    expect(await redis.get(`xp-today:${user.id}`)).toBe('105');
    fail = false;
    await completion.flushPending();
    await expect(
      challenges.submitChallenge(challenge.id, user.id, answers()),
    ).resolves.toEqual(result);
    expect(await points()).toBe(105);
    expect(await redis.get(`xp-today:${user.id}`)).toBe('105');
    expect(
      await redis.get(
        `ranking:week:${getRankingWeekStart()}:challenges:${user.id}`,
      ),
    ).toBe('1');
  });

  it('primeira leitura já marca o check-in com efeitos Redis atrasados', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const spy = jest
      .spyOn(redis, 'applyActivityCompletion')
      .mockImplementation(async (record) => {
        await gate;
        await RedisService.prototype.applyActivityCompletion.call(
          redis,
          record,
        );
      });
    try {
      const result = await challenges.submitChallenge(
        challenge.id,
        user.id,
        answers(),
      );
      expect(result.pointsEarned).toBe(100);
      const checkins = new DailyCheckinService(
        source,
        completion,
        {} as never,
        redis,
      );
      expect(await checkins.weekly(user.id)).toMatchObject({
        checkedToday: true,
        streak: 1,
      });
      expect(await points()).toBe(105);
      expect(await monthlyPoints()).toBe(105);
      expect(
        await source
          .getRepository(DailyCheckin)
          .countBy({ usuario_id: user.id }),
      ).toBe(1);
    } finally {
      release();
      spy.mockRestore();
      await completion.flushPending();
    }
  });

  it('falha SQL do check-in reverte também missão, resultado e XP', async () => {
    await source.query(`CREATE TRIGGER fixture_checkin_failure BEFORE INSERT ON daily_checkin
      FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fixture checkin failure'`);
    try {
      await expect(
        challenges.submitChallenge(challenge.id, user.id, answers()),
      ).rejects.toThrow('fixture checkin failure');
      expect(await points()).toBe(0);
      expect(await monthlyPoints()).toBe(0);
      expect(
        await source
          .getRepository(UsuarioChallenge)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
      expect(
        await source
          .getRepository(ActivityCompletion)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
      expect(
        await source
          .getRepository(DailyCheckin)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
    } finally {
      await source.query('DROP TRIGGER fixture_checkin_failure');
    }
    await challenges.submitChallenge(challenge.id, user.id, answers());
    expect(await points()).toBe(105);
  });

  it('replay pertence ao usuário autenticado, não a outro aluno', async () => {
    await challenges.submitChallenge(challenge.id, user.id, answers());
    const other = await source
      .getRepository(Usuario)
      .save({ name: 'Outro Fixture', password: 'fixture-unused' });
    expect(
      await completion.replay(other.id, 'challenge', challenge.id),
    ).toBeNull();
  });

  it('preserva conclusão legada sem inventar recompensa ou resultado', async () => {
    await source.getRepository(UsuarioChallenge).save({
      usuario_id: user.id,
      challenge_id: challenge.id,
      completed: true,
      progress: 100,
    });
    await expect(
      challenges.submitChallenge(challenge.id, user.id, answers()),
    ).rejects.toThrow(/já realizou/);
    expect(await points()).toBe(0);
  });

  it('aula concorrente concede XP e bônus do módulo uma vez, com resultado estável', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => lessons.concluir(lesson.id, user.id)),
    );
    expect(results.every((result) => result.xp_ganho === 50)).toBe(true);
    expect(await points()).toBe(75);
    expect(await monthlyPoints()).toBe(75);
    expect(
      await source.getRepository(Notification).countBy({ usuario_id: user.id }),
    ).toBe(1);
    expect(
      await source
        .getRepository(UsuarioAula)
        .countBy({ usuario_id: user.id, completed: true }),
    ).toBe(1);
    await lessons.updateProgress(lesson.id, user.id, {
      progress_percent: 10,
      last_video_second: 1,
    });
    expect(
      await source
        .getRepository(UsuarioAula)
        .findOneBy({ usuario_id: user.id }),
    ).toMatchObject({ completed: true, progress_percent: 100 });
  }, 30_000);

  it('falha do crédito SQL reverte aula, bônus e notificação; retry conclui normalmente', async () => {
    await source.query(`CREATE TRIGGER fixture_lesson_failure BEFORE INSERT ON ranking_season_points
      FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fixture lesson failure'`);
    try {
      await expect(lessons.concluir(lesson.id, user.id)).rejects.toThrow(
        'fixture lesson failure',
      );
      expect(
        await source
          .getRepository(UsuarioAula)
          .countBy({ usuario_id: user.id, completed: true }),
      ).toBe(0);
      expect(
        await source
          .getRepository(Notification)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
      expect(
        await source
          .getRepository(ActivityCompletion)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
    } finally {
      await source.query('DROP TRIGGER fixture_lesson_failure');
    }
    await lessons.concluir(lesson.id, user.id);
    expect(await points()).toBe(75);
  });

  it('quiz de aula recupera score/correções originais após falha de evento, sem novo crédito', async () => {
    await source
      .getRepository(Aula)
      .update(lesson.id, { type: AulaType.TEXTO });
    const quiz = await source.getRepository(AulaQuiz).save({
      aula_id: lesson.id,
      text: 'Seguro?',
      options: ['A', 'B'],
      correct_index: 0,
    });
    events.on('progress.changed', () => {
      throw new Error('fixture event failure');
    });
    const result = await lessons.submitQuiz(lesson.id, user.id, {
      answers: [{ questionId: quiz.id, selectedIndex: 0 }],
    });
    events.removeAllListeners();
    await expect(
      lessons.submitQuiz(lesson.id, user.id, {
        answers: [{ questionId: quiz.id, selectedIndex: 1 }],
      }),
    ).resolves.toEqual(result);
    expect(await points()).toBe(75);
    expect(result.score).toBe(100);
    expect(await redis.get(`xp-today:${user.id}`)).toBe('75');
  });

  it('PATCH de missão concorrente não reabre conclusão nem duplica a linha', async () => {
    await Promise.allSettled([
      challenges.saveProgress(challenge.id, user.id, question.id, 0),
      challenges.submitChallenge(challenge.id, user.id, answers()),
    ]);
    expect(
      await source
        .getRepository(UsuarioChallenge)
        .findOneBy({ usuario_id: user.id }),
    ).toMatchObject({ completed: true });
    expect(
      await source
        .getRepository(UsuarioChallenge)
        .countBy({ usuario_id: user.id }),
    ).toBe(1);
    expect(await points()).toBe(105);
  });

  it('cache perdido mantém missão parcial atribuída no mesmo dia', async () => {
    await challenges.saveProgress(challenge.id, user.id, question.id, 0);
    await redis.del(`daily-challenge:${user.id}`);
    expect((await challenges.getDailyChallenge(user.id))?.id).toBe(
      challenge.id,
    );
  });

  it('rollback com resultados existentes é bloqueado para preservar idempotência', async () => {
    await challenges.submitChallenge(challenge.id, user.id, answers());
    const runner = source.createQueryRunner();
    try {
      await expect(
        new ActivityCompletion1793232000000().down(runner),
      ).rejects.toThrow(/preserve/);
      expect(await runner.hasTable('activity_completion')).toBe(true);
    } finally {
      await runner.release();
    }
  });

  it('resultado da aula permanece recuperável após desativação e edição editorial', async () => {
    const original = await lessons.concluir(lesson.id, user.id);
    await source
      .getRepository(Aula)
      .update(lesson.id, { active: false, type: AulaType.TEXTO });
    await expect(lessons.concluir(lesson.id, user.id)).resolves.toEqual(
      original,
    );
    expect(await points()).toBe(75);
  });

  it('resultado do quiz permanece recuperável após remoção das questões e troca do formato', async () => {
    await source
      .getRepository(Aula)
      .update(lesson.id, { type: AulaType.TEXTO });
    const quiz = await source.getRepository(AulaQuiz).save({
      aula_id: lesson.id,
      text: 'Fixture',
      options: ['A', 'B'],
      correct_index: 0,
    });
    const original = await lessons.submitQuiz(lesson.id, user.id, {
      answers: [{ questionId: quiz.id, selectedIndex: 0 }],
    });
    await source.getRepository(AulaQuiz).delete(quiz.id);
    await source
      .getRepository(Aula)
      .update(lesson.id, { active: false, type: AulaType.VIDEO });
    await expect(
      lessons.submitQuiz(lesson.id, user.id, { answers: [] }),
    ).resolves.toEqual(original);
    expect(await points()).toBe(75);
  });

  it('reprocessamento após reinício recupera a outbox sem nova submissão do aluno', async () => {
    const spy = jest
      .spyOn(redis, 'applyActivityCompletion')
      .mockRejectedValue(new Error('fixture outage'));
    await challenges.submitChallenge(challenge.id, user.id, answers());
    spy.mockRestore();
    const restarted = new ActivityCompletionService(source, redis, events);
    await restarted.flushPending();
    expect(
      await source
        .getRepository(ActivityCompletion)
        .findOneBy({ usuario_id: user.id, activity_type: 'challenge' }),
    ).toMatchObject({ effects_processed: true });
    expect(await points()).toBe(105);
    expect(await redis.get(`xp-today:${user.id}`)).toBe('105');
  });

  it('efeito atrasado usa a semana original e não aumenta o XP de hoje', async () => {
    const previousDay = new Date(
      new Date(`${getLocalDateKey()}T00:00:00-03:00`).getTime() - 60_000,
    );
    const record = await source.getRepository(ActivityCompletion).save({
      usuario_id: user.id,
      activity_type: 'challenge',
      activity_id: challenge.id,
      result: {},
      xp: 10,
      previous_points: 0,
      created_at: previousDay,
      effects_processed: true,
    });
    await redis.set(`xp-today:${user.id}`, '7', 600);
    await redis.applyActivityCompletion(record);
    await redis.applyActivityCompletion(record);
    expect(await redis.get(`xp-today:${user.id}`)).toBe('7');
    expect(
      await redis.get(
        `ranking:week:${getRankingWeekStart(previousDay)}:xp:${user.id}`,
      ),
    ).toBe('10');
    expect(
      await redis.get(
        `ranking:week:${getRankingWeekStart(previousDay)}:challenges:${user.id}`,
      ),
    ).toBe('1');
  });

  it('métrica inválida aborta o Lua antes de qualquer incremento', async () => {
    const record = await source.getRepository(ActivityCompletion).save({
      usuario_id: user.id,
      activity_type: 'challenge',
      activity_id: challenge.id,
      result: {},
      xp: 10,
      previous_points: 0,
      effects_processed: true,
    });
    await redis.set(
      `ranking:week:${getRankingWeekStart()}:challenges:${user.id}`,
      '0.5',
      600,
    );
    await expect(redis.applyActivityCompletion(record)).rejects.toThrow(
      /Invalid activity metric value/,
    );
    expect(
      await redis.get(`ranking:week:${getRankingWeekStart()}:xp:${user.id}`),
    ).toBeNull();
    expect(await redis.get(`activity-effect:${record.id}`)).toBeNull();
  });

  it('falha ao persistir o resultado depois do crédito SQL reverte toda a unidade', async () => {
    await source.query(`CREATE TRIGGER fixture_completion_failure BEFORE INSERT ON activity_completion
      FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fixture completion failure'`);
    try {
      await expect(
        challenges.submitChallenge(challenge.id, user.id, answers()),
      ).rejects.toThrow(/fixture completion failure/);
      expect(await points()).toBe(0);
      expect(await monthlyPoints()).toBe(0);
      expect(
        await source
          .getRepository(UsuarioChallenge)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
    } finally {
      await source.query('DROP TRIGGER fixture_completion_failure');
    }
    await challenges.submitChallenge(challenge.id, user.id, answers());
    expect(await points()).toBe(105);
  });

  it('synchronize não cria o índice sensível antes do preflight da migração', async () => {
    const runner = source.createQueryRunner();
    try {
      await runner.dropIndex(
        'usuario_challenge',
        'ux_usuario_challenge_source',
      );
      await source.synchronize();
      expect(
        (await runner.getTable('usuario_challenge'))?.indices.some(
          (index) => index.name === 'ux_usuario_challenge_source',
        ),
      ).toBe(false);
      await new ActivityCompletion1793232000000().up(runner);
    } finally {
      await runner.release();
    }
  });
});
