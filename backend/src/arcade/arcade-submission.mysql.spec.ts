import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import {
  arcadeFixture,
  listenProgress,
} from '../../test/fixtures/arcade-fixture';
import { TokenService } from './token.service';
import { Usuario } from '../usuario/usuario.entity';
import { Empresa } from '../empresa/empresa.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { RankingSeasonPoints } from '../dashboard/ranking-season-points.entity';
import { getLocalDateKey } from '../common/utils/date.utils';
import { ActivityCompletion } from '../common/gamification/activity-completion.entity';
import { ArcadeRun } from './entities/arcade-run.entity';
import { ArcadeDailyPlays } from './entities/arcade-daily-plays.entity';
import { UsuarioArcadeStats } from './entities/usuario-arcade-stats.entity';
import { ArcadeSubmissionService } from './arcade-submission.service';
import { ArcadeGameType } from './entities/arcade-game.entity';
import { resolveCompanyParameters } from '../config/features';
import { legacyArcadeDayKeys } from './arcade-rewards';
import { ArcadeRunCompletion1793318400000 } from '../database/migrations/1793318400000-arcade-run-completion';

const isolated =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;
isolated('C04 — partidas duráveis, recibos e XP no MySQL/Redis reais', () => {
  let f: Awaited<ReturnType<typeof arcadeFixture>>;
  let user: Usuario;
  beforeAll(async () => {
    f = await arcadeFixture();
  }, 60_000);
  beforeEach(async () => {
    await f.source.getRepository(Empresa).update(f.company.id, {
      parametros_funcionalidades: resolveCompanyParameters(),
    });
    user = await f.source.getRepository(Usuario).save({
      name: 'Aluno Fixture',
      password: 'fixture-unused',
      empresa_id: f.company.id,
    });
    await f.tokens.refillToCap(user.id);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    f.events.removeAllListeners();
  });
  afterAll(async () => {
    f?.submissions.onModuleDestroy();
    f?.completions.onModuleDestroy();
    f?.redis.onModuleDestroy();
    if (f?.source.isInitialized) await f.source.destroy();
  });
  const start = () => f.arcade.start(user.id, 'quiz-relampago');
  const answers = (run: { payload: unknown }, index = 0) => ({
    quizAnswers: (
      run.payload as { questions: Array<{ id: number }> }
    ).questions.map((question) => ({
      questionId: question.id,
      selectedIndex: index,
    })),
  });
  const points = async () =>
    (
      await f.source
        .getRepository(UsuarioStats)
        .findOneBy({ usuario_id: user.id })
    )?.total_points ?? 0;
  const disable = () =>
    f.source.getRepository(Empresa).update(f.company.id, {
      parametros_funcionalidades: resolveCompanyParameters({
        enabledGames: [],
      }),
    });
  const failCredits = async (): Promise<void> => {
    await f.source.query(
      `CREATE TRIGGER fixture_arcade_failure BEFORE INSERT ON ranking_season_points FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fixture arcade failure'`,
    );
  };
  const restoreCredits = async (): Promise<void> => {
    await f.source.query('DROP TRIGGER fixture_arcade_failure');
  };

  it('migração suporta up/down/up vazios sem sincronização antecipada', async () => {
    const runner = f.source.createQueryRunner();
    const migration = new ArcadeRunCompletion1793318400000();
    try {
      await migration.down(runner);
      await f.source.synchronize();
      expect(await runner.hasTable('arcade_run')).toBe(false);
      await migration.up(runner);
    } finally {
      await runner.release();
    }
  });

  it('start preserva a ficha, não expõe gabarito e cria partida SQL com 30min', async () => {
    const run = await start();
    const row = await f.source
      .getRepository(ArcadeRun)
      .findOneByOrFail({ run_id: run.runId });
    expect(row.usuario_id).toBe(user.id);
    expect(row.expires_at.getTime() - Date.now()).toBeGreaterThan(29 * 60_000);
    expect((await f.tokens.getState(user.id)).balance).toBe(5);
    expect(JSON.stringify(run.payload)).not.toMatch(
      /correct_index|correctIndex|answerKey/,
    );
  });

  it('12 submits simultâneos retornam um único resultado, débito, estatística e XP', async () => {
    const run = await start();
    const observed: number[] = [];
    listenProgress(f.events, async () => {
      observed.push(
        (
          await f.source.getRepository(UsuarioArcadeStats).findOneByOrFail({
            usuario_id: user.id,
            game_slug: 'quiz-relampago',
          })
        ).total_plays,
      );
    });
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        f.arcade.submit(user.id, run.runId, answers(run)),
      ),
    );
    for (const result of results) expect(result).toEqual(results[0]);
    expect(results[0]).toMatchObject({
      score: 100,
      xpEarned: 100,
      playsToday: 1,
    });
    expect(await points()).toBe(100);
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
    expect(observed).toEqual([1]);
    expect(
      await f.source
        .getRepository(ActivityCompletion)
        .countBy({ usuario_id: user.id }),
    ).toBe(1);
    expect(
      (
        await f.source.getRepository(RankingSeasonPoints).findOneByOrFail({
          usuario_id: user.id,
          season_id: getLocalDateKey().slice(0, 7),
        })
      ).points,
    ).toBe(100);
  }, 30_000);

  it('retry com novas respostas devolve a primeira conclusão sem nova cobrança', async () => {
    const run = await start();
    const original = await f.arcade.submit(user.id, run.runId, answers(run));
    expect(await f.arcade.submit(user.id, run.runId, answers(run, 1))).toEqual(
      original,
    );
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
  });

  it('1ª/2ª/3ª conclusão aplicam 100%/50%/25% sem contador Redis antecipado', async () => {
    const multipliers: number[] = [];
    for (let index = 0; index < 3; index++) {
      const run = await start();
      multipliers.push(
        (await f.arcade.submit(user.id, run.runId, answers(run))).multiplier,
      );
    }
    expect(multipliers).toEqual([1, 0.5, 0.25]);
    expect(await points()).toBe(175);
    expect(
      (
        await f.source
          .getRepository(ArcadeDailyPlays)
          .findOneByOrFail({ usuario_id: user.id })
      ).plays,
    ).toBe(3);
  });

  it('pontuação zero consome uma ficha e não concede piso de XP', async () => {
    const run = await start();
    expect(
      await f.arcade.submit(user.id, run.runId, answers(run, 1)),
    ).toMatchObject({ score: 0, xpEarned: 0 });
    expect(await points()).toBe(0);
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
  });

  it('falha após o débito reverte estatísticas, contador e XP e permite retry sem segundo débito', async () => {
    const run = await start();
    await failCredits();
    try {
      await expect(
        f.arcade.submit(user.id, run.runId, answers(run)),
      ).rejects.toThrow('fixture arcade failure');
      expect(await points()).toBe(0);
      expect(
        await f.source
          .getRepository(UsuarioArcadeStats)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
      expect(
        await f.source
          .getRepository(ArcadeDailyPlays)
          .countBy({ usuario_id: user.id }),
      ).toBe(0);
      expect((await f.tokens.getState(user.id)).balance).toBe(4);
    } finally {
      await restoreCredits();
    }
    expect(
      await f.arcade.submit(user.id, run.runId, answers(run, 1)),
    ).toMatchObject({ score: 100, xpEarned: 100, playsToday: 1 });
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
  });

  it('worker de nova instância recupera ficha já cobrada após crash, sem retry do aluno', async () => {
    const run = await start();
    await failCredits();
    try {
      await expect(
        f.arcade.submit(user.id, run.runId, answers(run)),
      ).rejects.toThrow();
    } finally {
      await restoreCredits();
    }
    const recovered = new ArcadeSubmissionService(
      f.source,
      f.redis,
      f.tokens,
      f.completions,
      f.features,
      f.runs,
    );
    await recovered.flushPending();
    expect(await points()).toBe(100);
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
    expect(
      await f.source.getRepository(ArcadeRun).findOneBy({ run_id: run.runId }),
    ).toMatchObject({ completed: true, answer_key: null, correction: null });
  });

  it('cobrança confirmada pode ser finalizada após expiração e desativação do jogo', async () => {
    const run = await start();
    await failCredits();
    try {
      await expect(
        f.arcade.submit(user.id, run.runId, answers(run)),
      ).rejects.toThrow();
    } finally {
      await restoreCredits();
    }
    await f.source
      .getRepository(ArcadeRun)
      .update({ run_id: run.runId }, { expires_at: new Date(0) });
    await disable();
    await f.submissions.flushPending();
    expect(await points()).toBe(100);
    expect(
      await f.arcade.submit(user.id, run.runId, answers(run)),
    ).toMatchObject({ xpEarned: 100 });
  });

  it('jogo desabilitado antes da primeira cobrança não consome ficha ou concede XP', async () => {
    const run = await start();
    await disable();
    await expect(
      f.arcade.submit(user.id, run.runId, answers(run)),
    ).rejects.toThrow(/não disponível/);
    expect((await f.tokens.getState(user.id)).balance).toBe(5);
    expect(await points()).toBe(0);
  });

  it('primeiro submit expirado não cobra nem concede XP', async () => {
    const run = await start();
    await f.source
      .getRepository(ArcadeRun)
      .update({ run_id: run.runId }, { expires_at: new Date(0) });
    await expect(
      f.arcade.submit(user.id, run.runId, answers(run)),
    ).rejects.toThrow(/expirada/);
    expect((await f.tokens.getState(user.id)).balance).toBe(5);
  });

  it('sem ficha preserva a partida sem corrigir/cobrar ou agendar cobrança futura', async () => {
    const run = await start();
    await f.redis.set(
      `op-tokens:${user.id}`,
      JSON.stringify({ balance: 0, lastRegenAt: Date.now() }),
      600,
    );
    await expect(
      f.arcade.submit(user.id, run.runId, answers(run)),
    ).rejects.toThrow(/Sem tentativas/);
    expect(
      await f.source.getRepository(ArcadeRun).findOneBy({ run_id: run.runId }),
    ).toMatchObject({ correction: null, completed: false });
    await f.tokens.refillToCap(user.id);
    await f.submissions.flushPending();
    expect(await points()).toBe(0);
    expect((await f.tokens.getState(user.id)).balance).toBe(5);
  });

  it('usuário diferente não recupera nem cobra a partida de outro aluno', async () => {
    const run = await start();
    const other = await f.source.getRepository(Usuario).save({
      name: 'Outro Fixture',
      password: 'fixture-unused',
      empresa_id: f.company.id,
    });
    await expect(
      f.arcade.submit(other.id, run.runId, answers(run)),
    ).rejects.toThrow(/Partida invalida/);
    expect(await points()).toBe(0);
    expect((await f.tokens.getState(other.id)).balance).toBe(5);
  });

  it('perder o cache da run não perde a partida SQL', async () => {
    const run = await start();
    await f.redis.del(`arcade-run:${user.id}:${run.runId}`);
    expect(
      await f.arcade.submit(user.id, run.runId, answers(run)),
    ).toMatchObject({ xpEarned: 100 });
  });

  it('importa run legada mantendo proprietário e TTL restante, sem renovar 30min', async () => {
    const runId = randomUUID();
    const built = await f.quiz.buildRun();
    await f.redis.set(
      `arcade-run:${user.id}:${runId}`,
      JSON.stringify({
        usuario_id: user.id,
        slug: 'quiz-relampago',
        game_type: ArcadeGameType.QUIZ,
        xp_base: 100,
        answerKey: built.answerKey,
      }),
      60,
    );
    expect(await f.arcade.submit(user.id, runId, answers(built))).toMatchObject(
      { xpEarned: 100 },
    );
    const imported = await f.source
      .getRepository(ArcadeRun)
      .findOneByOrFail({ run_id: runId });
    expect(imported.expires_at.getTime() - Date.now()).toBeLessThanOrEqual(
      60_000,
    );
  });

  it('recusa owner inválido e TTL ausente na run legada', async () => {
    const id = randomUUID();
    await f.redis.set(
      `arcade-run:${user.id}:${id}`,
      JSON.stringify({ usuario_id: user.id + 1 }),
      60,
    );
    await expect(f.arcade.submit(user.id, id, {})).rejects.toThrow(
      /Partida invalida/,
    );
    expect((await f.tokens.getState(user.id)).balance).toBe(5);
  });

  it('importa contador Redis legado sem conceder novamente multiplicador cheio', async () => {
    for (const key of legacyArcadeDayKeys(
      user.id,
      'quiz-relampago',
      new Date(),
    ))
      await f.redis.set(key, '2', 600);
    const run = await start();
    const result = await f.arcade.submit(user.id, run.runId, answers(run));
    expect(result.multiplier).toBe(0.25);
    expect(result.playsToday).toBe(
      legacyArcadeDayKeys(user.id, 'quiz-relampago', new Date()).length * 2 + 1,
    );
  });

  it('erro Redis pós-commit não cobra novamente e a outbox recupera as métricas', async () => {
    const run = await start();
    const spy = jest
      .spyOn(f.redis, 'applyActivityCompletion')
      .mockRejectedValue(new Error('fixture Redis unavailable'));
    const result = await f.arcade.submit(user.id, run.runId, answers(run));
    spy.mockRestore();
    expect(await f.arcade.submit(user.id, run.runId, answers(run))).toEqual(
      result,
    );
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
    expect(await f.redis.get(`xp-today:${user.id}`)).toBe('100');
  });

  it('limpa apenas partidas nunca submetidas e mantém replay de concluídas', async () => {
    const completed = await start();
    await f.arcade.submit(user.id, completed.runId, answers(completed));
    const abandoned = await start();
    await f.source
      .getRepository(ArcadeRun)
      .update(
        { run_id: abandoned.runId },
        { expires_at: new Date(Date.now() - 25 * 3600_000) },
      );
    await f.submissions.flushPending();
    expect(
      await f.source
        .getRepository(ArcadeRun)
        .findOneBy({ run_id: abandoned.runId }),
    ).toBeNull();
    expect(
      await f.arcade.submit(user.id, completed.runId, answers(completed)),
    ).toMatchObject({ xpEarned: 100 });
  });

  it('rollback com partidas registradas é bloqueado', async () => {
    await start();
    const runner = f.source.createQueryRunner();
    try {
      await expect(
        new ArcadeRunCompletion1793318400000().down(runner),
      ).rejects.toThrow(/preserve/);
    } finally {
      await runner.release();
    }
  });

  it('instâncias distintas convergem para o mesmo resultado sem segunda cobrança', async () => {
    const run = await start();
    const other = new ArcadeSubmissionService(
      f.source,
      f.redis,
      f.tokens,
      f.completions,
      f.features,
      f.runs,
    );
    const results = await Promise.all([
      f.submissions.submit(user.id, run.runId, answers(run)),
      other.submit(user.id, run.runId, answers(run)),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(await points()).toBe(100);
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
  });

  it('recibo perdido após débito/rollback falha fechado sem cobrar uma segunda ficha', async () => {
    const run = await start();
    await failCredits();
    try {
      await expect(
        f.arcade.submit(user.id, run.runId, answers(run)),
      ).rejects.toThrow();
    } finally {
      await restoreCredits();
    }
    await f.redis.del(`op-token-receipt:${user.id}:${run.runId}`);
    await expect(
      f.arcade.submit(user.id, run.runId, answers(run)),
    ).rejects.toThrow(/aguardando recuperação/);
    expect((await f.tokens.getState(user.id)).balance).toBe(4);
    expect(await points()).toBe(0);
  });

  it('libera reserva quando o jogo é desabilitado antes de qualquer débito', async () => {
    const run = await start();
    const spy = jest
      .spyOn(f.features, 'requireGame')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new NotFoundException('fixture game disabled'));
    await expect(
      f.arcade.submit(user.id, run.runId, answers(run)),
    ).rejects.toThrow('fixture game disabled');
    spy.mockRestore();
    expect(
      await f.source.getRepository(ArcadeRun).findOneBy({ run_id: run.runId }),
    ).toMatchObject({ correction: null, submitted_at: null });
    expect((await f.tokens.getState(user.id)).balance).toBe(5);
    await expect(
      f.arcade.submit(user.id, run.runId, answers(run)),
    ).resolves.toMatchObject({ xpEarned: 100 });
  });

  it('libera reserva quando o Lua confirma prazo vencido sem débito', async () => {
    const run = await start();
    const original = new TokenService(f.redis);
    const spy = jest
      .spyOn(f.tokens, 'consumeForRun')
      .mockImplementationOnce((id, uuid) =>
        original.consumeForRun(id, uuid, new Date(0)),
      );
    await expect(
      f.arcade.submit(user.id, run.runId, answers(run)),
    ).rejects.toThrow(/expirada/);
    spy.mockRestore();
    expect(
      await f.source.getRepository(ArcadeRun).findOneBy({ run_id: run.runId }),
    ).toMatchObject({ correction: null, submitted_at: null });
    expect((await f.tokens.getState(user.id)).balance).toBe(5);
    await expect(
      f.arcade.submit(user.id, run.runId, answers(run)),
    ).resolves.toMatchObject({ xpEarned: 100 });
  });

  it('listener lento não bloqueia a resposta confirmada nem a conclusão de outro aluno', async () => {
    const run = await start();
    const other = await f.source.getRepository(Usuario).save({
      name: 'Outro Fixture',
      password: 'fixture-unused',
      empresa_id: f.company.id,
    });
    const otherRun = await f.arcade.start(other.id, 'quiz-relampago');
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    listenProgress(f.events, async ({ usuarioId }: { usuarioId: number }) => {
      if (usuarioId === user.id) {
        entered();
        await gate;
      }
    });
    const first = f.arcade.submit(user.id, run.runId, answers(run));
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await started;
      await Promise.race([
        Promise.all([
          first,
          f.arcade.submit(other.id, otherRun.runId, answers(otherRun)),
        ]),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Listener bloqueou respostas')),
            2000,
          );
        }),
      ]);
      expect(await points()).toBe(100);
      expect(
        (
          await f.source
            .getRepository(UsuarioStats)
            .findOneByOrFail({ usuario_id: other.id })
        ).total_points,
      ).toBe(100);
    } finally {
      if (timeout) clearTimeout(timeout);
      release();
      await first;
      await f.completions.flushPending();
    }
  });

  it('3ª partida com XP baixo mantém o piso de 10, sem aplicá-lo a score zero', async () => {
    for (let index = 0; index < 2; index++) {
      const run = await start();
      await f.arcade.submit(user.id, run.runId, answers(run));
    }
    const run = await start();
    jest.spyOn(f.quiz, 'correct').mockReturnValue({ score: 20, feedback: {} });
    expect(
      await f.arcade.submit(user.id, run.runId, answers(run)),
    ).toMatchObject({ xpBase: 20, multiplier: 0.25, xpEarned: 10 });
  });
});
