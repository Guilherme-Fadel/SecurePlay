import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Challenge } from './challenge.entity';
import { Question } from '../question/question.entity';
import { UsuarioChallenge } from '../usuario-challenge/usuario-challenge.entity';
import { RedisService } from '../redis/redis.service';
import { getLocalDateKey, ttlUntilEndOfDay } from '../common/utils/date.utils';
import { SubmitChallengeDto } from './dto/challenge.dto';
import { ActivityCompletionService } from '../common/gamification/activity-completion.service';
import { ChallengeResult, gradeChallenge } from './challenge-result';

@Injectable()
export class ChallengeService {
  constructor(
    @Inject('CHALLENGE_REPOSITORY')
    private challengeRepository: Repository<Challenge>,

    @Inject('QUESTION_REPOSITORY')
    private questionRepository: Repository<Question>,

    @Inject('USUARIO_CHALLENGE_REPOSITORY')
    private usuarioChallengeRepository: Repository<UsuarioChallenge>,

    private redisService: RedisService,
    private readonly completions: ActivityCompletionService,
  ) {}

  private localImageReference(source: string | null | undefined) {
    const normalized = source?.trim();
    return normalized && !normalized.startsWith('s3://') ? normalized : null;
  }

  async getDailyChallenge(usuario_id: number): Promise<Challenge | null> {
    const cached = await this.getRedisDailyChallenge(usuario_id);
    if (cached) {
      const current = await this.challengeRepository.findOne({
        where: { id: cached.id },
      });
      return {
        ...cached,
        image: this.localImageReference(current?.image ?? cached.image),
      };
    }

    const records = await this.usuarioChallengeRepository.find({
      where: { usuario_id },
      select: ['challenge_id', 'completed', 'started_at'],
      order: { started_at: 'DESC' },
    });
    const completedIds = records
      .filter((record) => record.completed)
      .map((record) => record.challenge_id);

    const activeChallenges = await this.challengeRepository.find({
      where: { active: true },
      select: ['id'],
      order: { id: 'ASC' },
    });
    const completed = new Set(completedIds);
    const availableIds = activeChallenges
      .map(({ id }) => id)
      .filter((id) => !completed.has(id));
    if (availableIds.length === 0) return null;

    // Seleção estável por usuário e dia: evita ORDER BY RAND(), que força o
    // banco a ordenar todos os desafios ativos a cada cache miss.
    const seed = `${usuario_id}:${getLocalDateKey()}`;
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }
    const partial = records.find(
      (record) =>
        !record.completed &&
        record.started_at &&
        getLocalDateKey(new Date(record.started_at)) === getLocalDateKey() &&
        availableIds.includes(record.challenge_id),
    );
    const selectedId =
      partial?.challenge_id ?? availableIds[hash % availableIds.length];
    const challenge = await this.challengeRepository.findOne({
      where: { id: selectedId, active: true },
    });

    if (challenge) {
      await this.setRedisDailyChallenge(usuario_id, challenge);
    }

    return challenge
      ? { ...challenge, image: this.localImageReference(challenge.image) }
      : null;
  }

  async countCompleted(usuario_id: number): Promise<number> {
    return this.usuarioChallengeRepository.count({
      where: { usuario_id },
    });
  }

  async countTotalActive(): Promise<number> {
    return this.challengeRepository.count({
      where: { active: true },
    });
  }

  private async getRedisDailyChallenge(
    usuario_id: number,
  ): Promise<Challenge | null> {
    const cacheKey = `daily-challenge:${usuario_id}`;
    const cached = await this.redisService.get(cacheKey);
    return cached ? (JSON.parse(cached) as Challenge) : null;
  }

  private async setRedisDailyChallenge(
    usuario_id: number,
    challenge: Challenge,
  ): Promise<void> {
    const cacheKey = `daily-challenge:${usuario_id}`;
    const ttl = ttlUntilEndOfDay();
    await this.redisService.set(cacheKey, JSON.stringify(challenge), ttl);
  }

  async getStatus(challengeId: number, usuario_id: number) {
    await this.ensureDailyChallenge(challengeId, usuario_id);

    const record = await this.usuarioChallengeRepository.findOne({
      where: { usuario_id, challenge_id: challengeId },
    });

    const totalQuestions = await this.questionRepository.count({
      where: { challenge_id: challengeId },
    });

    const answeredIds = record?.answered_question_ids ?? [];
    const answeredCount = record?.completed
      ? totalQuestions
      : answeredIds.length;

    return {
      completed: !!record?.completed,
      progress: record?.progress ?? 0,
      answeredCount,
      totalQuestions,
      completedAt: record?.completed_at ?? null,
    };
  }

  async saveProgress(
    challengeId: number,
    usuario_id: number,
    questionId: number,
    selectedIndex: number,
  ) {
    await this.ensureDailyChallenge(challengeId, usuario_id);

    const question = await this.questionRepository.findOne({
      where: { id: questionId, challenge_id: challengeId },
    });

    if (!question) {
      throw new NotFoundException('Questão não encontrada para este desafio');
    }

    return this.completions.updateProgress(usuario_id, async (manager) => {
      const repository = manager.getRepository(UsuarioChallenge);
      let record = await repository.findOne({
        where: { usuario_id, challenge_id: challengeId },
      });

      if (record?.completed) {
        throw new BadRequestException('Desafio já concluído');
      }

      if (!record) {
        record = repository.create({
          usuario_id,
          challenge_id: challengeId,
          progress: 0,
          completed: false,
          answered_question_ids: [],
        });
      }

      const answered = new Set(record.answered_question_ids ?? []);

      const isCorrect = selectedIndex === question.correct_index;
      if (isCorrect) {
        answered.add(questionId);
      }

      record.answered_question_ids = Array.from(answered);

      const totalQuestions = await manager.getRepository(Question).count({
        where: { challenge_id: challengeId },
      });
      record.progress =
        totalQuestions > 0
          ? Math.round(
              (record.answered_question_ids.length / totalQuestions) * 100,
            )
          : 0;

      if (record.id) {
        // Atualiza apenas o progresso parcial enquanto a tentativa estiver aberta.
        // Um PATCH atrasado não pode reverter a conclusão gravada pelo submit.
        const result = await repository.update(
          { id: record.id, completed: false },
          {
            answered_question_ids: record.answered_question_ids,
            progress: record.progress,
          },
        );
        if (!result.affected) {
          throw new BadRequestException('Desafio já concluído');
        }
      } else {
        await repository.save(record);
      }

      return {
        correct: isCorrect,
        answeredCount: record.answered_question_ids.length,
        totalQuestions,
        progress: record.progress,
        completed: false,
      };
    });
  }

  async getQuestions(challengeId: number, usuario_id: number) {
    await this.ensureDailyChallenge(challengeId, usuario_id);

    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId, active: true },
    });

    if (!challenge) {
      throw new NotFoundException('Desafio não encontrado');
    }

    const questions = await this.questionRepository.find({
      where: { challenge_id: challengeId },
      order: { order: 'ASC' },
    });

    return {
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        duration: challenge.duration,
        points: challenge.points,
        image: challenge.image,
      },
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        order: q.order,
      })),
    };
  }

  async submitChallenge(
    challengeId: number,
    usuario_id: number,
    dto: SubmitChallengeDto,
  ) {
    const replay = await this.completions.replay<ChallengeResult>(
      usuario_id,
      'challenge',
      challengeId,
    );
    if (replay) return replay;
    await this.ensureDailyChallenge(challengeId, usuario_id);

    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId, active: true },
    });

    if (!challenge) {
      throw new NotFoundException('Desafio não encontrado');
    }

    const questions = await this.questionRepository.find({
      where: { challenge_id: challengeId },
    });

    const result = gradeChallenge(challenge.points, questions, dto.answers);
    return this.completions.complete(
      usuario_id,
      'challenge',
      challengeId,
      async (manager) => {
        const repository = manager.getRepository(UsuarioChallenge);
        const existing = await repository.findOne({
          where: { usuario_id, challenge_id: challengeId },
        });
        // Legado sem resultado: não inventar correções nem conceder XP retroativo.
        if (existing?.completed)
          throw new BadRequestException('Você já realizou este desafio');
        await repository.save(
          repository.create({
            ...existing,
            usuario_id,
            challenge_id: challengeId,
            progress: result.score,
            completed: true,
            completed_at: new Date(),
            answered_question_ids: dto.answers.map(
              (answer) => answer.questionId,
            ),
          }),
        );
        return { result, xp: result.pointsEarned };
      },
    );
  }

  private async ensureDailyChallenge(
    challengeId: number,
    usuario_id: number,
  ): Promise<void> {
    const dailyChallenge = await this.getDailyChallenge(usuario_id);

    if (!dailyChallenge || dailyChallenge.id !== challengeId) {
      throw new BadRequestException(
        'Este não é o desafio diário selecionado para o usuário',
      );
    }
  }
}
