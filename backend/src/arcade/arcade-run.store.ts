import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { isUUID } from 'class-validator';
import { RedisService } from '../redis/redis.service';
import { ActivityCompletionService } from '../common/gamification/activity-completion.service';
import { ArcadeRun } from './entities/arcade-run.entity';
import { ArcadeGame, ArcadeGameType } from './entities/arcade-game.entity';
import { QuizRelampagoHandler } from './games/quiz-relampago.handler';
import { PhishingHandler } from './games/phishing.handler';
import { DataClassifyHandler } from './games/data-classify.handler';
import { GameHandler } from './games/game-handler';
import { SubmitRunDto } from './dto/arcade.dto';

@Injectable()
export class ArcadeRunStore {
  constructor(
    @Inject('DATA_SOURCE') private readonly source: DataSource,
    private readonly redis: RedisService,
    private readonly completions: ActivityCompletionService,
    private readonly quiz: QuizRelampagoHandler,
    private readonly phishing: PhishingHandler,
    private readonly classify: DataClassifyHandler,
  ) {}
  async create(
    user: number,
    runId: string,
    game: ArcadeGame,
    answerKey: unknown,
  ): Promise<void> {
    await this.source.getRepository(ArcadeRun).save({
      run_id: runId,
      usuario_id: user,
      slug: game.slug,
      game_type: game.game_type,
      xp_base: game.xp_base,
      answer_key: answerKey,
      expires_at: new Date(Date.now() + 30 * 60_000),
    });
  }

  private handler(type: ArcadeGameType): GameHandler {
    if (type === ArcadeGameType.QUIZ) return this.quiz;
    if (type === ArcadeGameType.PHISHING) return this.phishing;
    if (type === ArcadeGameType.DATA_CLASSIFY) return this.classify;
    throw new BadRequestException('Jogo ainda nao disponivel.');
  }

  async resolve(user: number, runId: string): Promise<ArcadeRun> {
    if (!isUUID(runId, '4')) throw new BadRequestException('Partida invalida.');
    const found = await this.source
      .getRepository(ArcadeRun)
      .findOneBy({ run_id: runId, usuario_id: user });
    if (found) return found;
    return this.completions.updateProgress(user, async (manager) => {
      const repository = manager.getRepository(ArcadeRun);
      const existing = await repository.findOneBy({
        run_id: runId,
        usuario_id: user,
      });
      if (existing) return existing;
      const now = Date.now();
      const cached = await this.redis.getWithTtl(`arcade-run:${user}:${runId}`);
      if (!cached || cached.ttlMs <= 0 || cached.ttlMs > 30 * 60_000)
        throw new BadRequestException('Partida invalida ou expirada.');
      let decoded: unknown;
      try {
        decoded = JSON.parse(cached.value);
      } catch {
        throw new BadRequestException('Partida invalida.');
      }
      if (!decoded || typeof decoded !== 'object')
        throw new BadRequestException('Partida invalida.');
      const stored = decoded as {
        usuario_id?: number;
        slug?: string;
        game_type?: ArcadeGameType;
        xp_base?: number;
        answerKey?: unknown;
      };
      if (
        stored.usuario_id !== user ||
        typeof stored.slug !== 'string' ||
        !stored.game_type ||
        !Object.values(ArcadeGameType).includes(stored.game_type) ||
        !Number.isInteger(stored.xp_base) ||
        (stored.xp_base ?? -1) < 0 ||
        stored.answerKey == null
      ) {
        throw new BadRequestException('Partida invalida.');
      }
      return repository.save(
        repository.create({
          run_id: runId,
          usuario_id: user,
          slug: stored.slug,
          game_type: stored.game_type,
          xp_base: stored.xp_base,
          answer_key: stored.answerKey,
          expires_at: new Date(now + cached.ttlMs),
        }),
      );
    });
  }

  async reserve(run: ArcadeRun, dto: SubmitRunDto): Promise<boolean> {
    let initialDebit = false;
    if (!run.correction && !run.completed) {
      await this.completions.updateProgress(run.usuario_id, async (manager) => {
        const repository = manager.getRepository(ArcadeRun);
        const current = await repository.findOneByOrFail({
          id: run.id,
          usuario_id: run.usuario_id,
        });
        if (current.correction || current.completed) return;
        if (current.expires_at.getTime() <= Date.now())
          throw new BadRequestException('Partida expirada.');
        const correction = this.handler(current.game_type).correct(
          current.answer_key,
          dto,
        );
        if (
          !Number.isFinite(correction.score) ||
          correction.score < 0 ||
          correction.score > 100
        )
          throw new BadRequestException('Resultado de partida inválido.');
        current.correction = correction;
        current.submitted_at = new Date();
        await repository.save(current);
        initialDebit = true;
      });
    }
    return initialDebit;
  }
}
