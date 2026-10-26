import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { setTimeout as delay } from 'timers/promises';
import { DataSource, IsNull, LessThan, MoreThan, Not } from 'typeorm';
import { ActivityCompletionService } from '../common/gamification/activity-completion.service';
import { CompanyFeaturesService } from '../common/features/company-features.service';
import { RedisService } from '../redis/redis.service';
import { TokenService } from './token.service';
import { ArcadeRun } from './entities/arcade-run.entity';
import { ArcadeGame } from './entities/arcade-game.entity';
import { ArcadeRunStore } from './arcade-run.store';
import { UsuarioArcadeStats } from './entities/usuario-arcade-stats.entity';
import { SubmitRunDto } from './dto/arcade.dto';
import { advanceArcadeDay, arcadeReward, ArcadeResult } from './arcade-rewards';

@Injectable()
export class ArcadeSubmissionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ArcadeSubmissionService.name);
  private timer?: ReturnType<typeof setInterval>;
  private draining = false;
  private cursor = 0;
  private readonly inFlight = new Map<string, Promise<ArcadeResult>>();

  constructor(
    @Inject('DATA_SOURCE') private readonly source: DataSource,
    private readonly redis: RedisService,
    private readonly tokens: TokenService,
    private readonly completions: ActivityCompletionService,
    private readonly features: CompanyFeaturesService,
    private readonly runs: ArcadeRunStore,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.flushPending(), 30_000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  create(user: number, runId: string, game: ArcadeGame, answerKey: unknown) {
    return this.runs.create(user, runId, game, answerKey);
  }

  submit(
    user: number,
    runId: string,
    dto: SubmitRunDto,
  ): Promise<ArcadeResult> {
    const key = `${user}:${runId}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    const pending = this.submitOnce(user, runId, dto).finally(() =>
      this.inFlight.delete(key),
    );
    this.inFlight.set(key, pending);
    return pending;
  }

  private async submitOnce(
    user: number,
    runId: string,
    dto: SubmitRunDto,
  ): Promise<ArcadeResult> {
    const run = await this.runs.resolve(user, runId);
    const replay = await this.completions.replay<ArcadeResult>(
      user,
      'arcade',
      run.id,
    );
    if (replay) return replay;
    const charged = await this.tokens.hasRunReceipt(user, runId);
    if (!charged) {
      await this.features.requireGame(user, run.slug);
      if (run.expires_at.getTime() <= Date.now())
        throw new BadRequestException('Partida expirada.');
      if ((await this.tokens.getState(user)).balance <= 0)
        throw new ForbiddenException('Sem tentativas no momento.');
    }
    // Persistir a correção antes do débito permite recuperar automaticamente um
    // crash/rollback SQL posterior ao recibo Redis sem pedir nova resposta ao aluno.
    const initialDebit = await this.runs.reserve(run, dto);
    if (!initialDebit && !charged) {
      // Outro processo pode estar entre a reserva e o recibo. Aguardar brevemente
      // sem segurar conexão/lock SQL. Recibo perdido nunca autoriza novo débito.
      for (let attempt = 0; attempt < 20; attempt++) {
        const result = await this.completions.replay<ArcadeResult>(
          user,
          'arcade',
          run.id,
        );
        if (result) return result;
        if (await this.tokens.hasRunReceipt(user, runId)) break;
        await delay(25);
      }
    }
    return this.finish(run, initialDebit);
  }

  private async finish(
    run: ArcadeRun,
    initialDebit = false,
  ): Promise<ArcadeResult> {
    const user = run.usuario_id;
    let debitAttempted = false;
    let result: ArcadeResult;
    try {
      result = await this.completions.complete(
        user,
        'arcade',
        run.id,
        async (manager, context) => {
          const repository = manager.getRepository(ArcadeRun);
          const current = await repository.findOneByOrFail({
            id: run.id,
            usuario_id: user,
          });
          if (!current.correction || current.completed)
            throw new BadRequestException('Partida sem resultado recuperável.');
          const correction = current.correction;
          // Uma cobrança já confirmada é finalizada mesmo após expiração/desativação;
          // toda primeira cobrança ainda exige a permissão atual e prazo válido.
          if (!(await this.tokens.hasRunReceipt(user, current.run_id))) {
            if (!initialDebit)
              throw new ServiceUnavailableException(
                'Partida aguardando recuperação; nenhuma ficha adicional foi cobrada.',
              );
            await this.features.requireGame(user, current.slug, manager);
          }
          const plays = await advanceArcadeDay(
            manager,
            this.redis,
            user,
            current.slug,
            context.createdAt,
          );
          debitAttempted = true;
          const consumed = await this.tokens.consumeForRun(
            user,
            current.run_id,
            current.expires_at,
          );
          if (consumed.expired) {
            debitAttempted = false;
            throw new BadRequestException('Partida expirada.');
          }
          if (!consumed.ok) {
            debitAttempted = false;
            throw new ForbiddenException('Sem tentativas no momento.');
          }
          const reward = arcadeReward(correction.score, current.xp_base, plays);
          const statsRepository = manager.getRepository(UsuarioArcadeStats);
          let stats = await statsRepository.findOneBy({
            usuario_id: user,
            game_slug: current.slug,
          });
          stats ??= statsRepository.create({
            usuario_id: user,
            game_slug: current.slug,
            total_plays: 0,
            perfect_runs: 0,
            best_score: 0,
          });
          stats.total_plays += 1;
          if (correction.score === 100) stats.perfect_runs += 1;
          stats.best_score = Math.max(stats.best_score, correction.score);
          stats.last_played_at = context.createdAt;
          await statsRepository.save(stats);
          current.completed = true;
          current.answer_key = null;
          current.correction = null;
          await repository.save(current);
          return {
            result: {
              score: correction.score,
              ...reward,
              playsToday: plays,
              feedback: correction.feedback,
              tokens: consumed.state,
            },
            xp: reward.xpEarned,
          };
        },
      );
    } catch (error) {
      if (initialDebit && !debitAttempted) {
        try {
          await this.releaseUncharged(run);
        } catch {
          this.logger.warn(
            `Reserva sem débito aguardando liberação ${run.run_id}`,
          );
        }
      }
      throw error;
    }
    try {
      await this.redis.del(`arcade-run:${user}:${run.run_id}`);
    } catch {
      /* cache expira sozinho; resultado SQL já confirmado */
    }
    return result;
  }

  private async releaseUncharged(run: ArcadeRun): Promise<void> {
    await this.completions.updateProgress(run.usuario_id, async (manager) => {
      const repository = manager.getRepository(ArcadeRun);
      const current = await repository.findOneByOrFail({
        id: run.id,
        usuario_id: run.usuario_id,
      });
      if (
        !current.completed &&
        !(await this.tokens.hasRunReceipt(run.usuario_id, run.run_id))
      ) {
        current.correction = null;
        current.submitted_at = null;
        await repository.save(current);
      }
    });
  }

  async flushPending(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      const repository = this.source.getRepository(ArcadeRun);
      const pending = await repository.find({
        where: {
          completed: false,
          submitted_at: Not(IsNull()),
          id: MoreThan(this.cursor),
        },
        order: { id: 'ASC' },
        take: 25,
      });
      if (!pending.length) this.cursor = 0;
      for (const run of pending) {
        this.cursor = run.id;
        try {
          if (await this.tokens.hasRunReceipt(run.usuario_id, run.run_id))
            await this.finish(run);
          else if (
            run.submitted_at &&
            Date.now() - run.submitted_at.getTime() > 60_000
          )
            this.logger.warn(
              `Partida aguardando conciliação de recibo ${run.run_id}`,
            );
        } catch {
          this.logger.warn(`Partida com recuperação pendente ${run.run_id}`);
        }
      }
      // Remove só partidas nunca submetidas, vencidas há mais de um dia.
      const expired = await repository.find({
        where: {
          completed: false,
          submitted_at: IsNull(),
          expires_at: LessThan(new Date(Date.now() - 24 * 3600_000)),
        },
        select: ['id'],
        take: 100,
      });
      if (expired.length) await repository.delete(expired.map((run) => run.id));
    } catch {
      this.logger.warn('Não foi possível consultar partidas pendentes');
    } finally {
      this.draining = false;
    }
  }
}
