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
import { DailyChallengeAssignment } from './daily-challenge-assignment.entity';
import {
  pickDailyChallengeId,
  readDailyCache,
  writeDailyCache,
} from './daily-challenge-selection';
import { RedisService } from '../redis/redis.service';
import { getLocalDateKey } from '../common/utils/date.utils';
import { SubmitChallengeDto } from './dto/challenge.dto';
import { ActivityCompletionService } from '../common/gamification/activity-completion.service';
import {
  ChallengeResult,
  gradeChallenge,
  assertSubmittable,
  mergeRecordedAnswers,
  recordFirstAnswer,
  buildQuestionsPayload,
} from './challenge-result';

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
    const cached = await readDailyCache(this.redisService, usuario_id);
    if (cached) {
      const current = await this.challengeRepository.findOne({
        where: { id: cached.id },
      });
      return {
        ...cached,
        image: this.localImageReference(current?.image ?? cached.image),
      };
    }

    // M6: a atribuição do dia é durável em SQL; o Redis acima é só cache.
    const day = getLocalDateKey();
    const assigned = await this.findAssignedChallenge(usuario_id, day);
    if (assigned) return assigned;

    const [records, activeChallenges] = await Promise.all([
      this.usuarioChallengeRepository.find({
        where: { usuario_id },
        select: ['challenge_id', 'completed', 'started_at'],
        order: { started_at: 'DESC' },
      }),
      this.challengeRepository.find({
        where: { active: true },
        select: ['id'],
        order: { id: 'ASC' },
      }),
    ]);
    const selectedId = pickDailyChallengeId(
      usuario_id,
      day,
      records,
      activeChallenges.map(({ id }) => id),
    );
    if (selectedId === null) return null;
    // INSERT IGNORE resolve a corrida: requisições simultâneas ficam com a mesma escolha.
    await this.usuarioChallengeRepository.manager.query(
      'INSERT IGNORE INTO daily_challenge_assignment (usuario_id, day, challenge_id) VALUES (?, ?, ?)',
      [usuario_id, day, selectedId],
    );
    const winner = await this.findAssignedChallenge(usuario_id, day);
    if (winner) return winner;
    const challenge = await this.challengeRepository.findOne({
      where: { id: selectedId, active: true },
    });

    if (challenge) {
      await writeDailyCache(this.redisService, usuario_id, challenge);
    }

    return challenge
      ? { ...challenge, image: this.localImageReference(challenge.image) }
      : null;
  }

  /** Só desafios concluídos; tentativa aberta não conta (I2). */
  async countCompleted(usuario_id: number): Promise<number> {
    return this.usuarioChallengeRepository.count({
      where: { usuario_id, completed: true },
    });
  }

  async countTotalActive(): Promise<number> {
    return this.challengeRepository.count({
      where: { active: true },
    });
  }

  /** Desafio já atribuído ao aluno no dia (SQL), repondo o cache do Redis. */
  private async findAssignedChallenge(
    usuario_id: number,
    day: string,
  ): Promise<Challenge | null> {
    const assignment = await this.usuarioChallengeRepository.manager.findOne(
      DailyChallengeAssignment,
      { where: { usuario_id, day } },
    );
    if (!assignment) return null;
    const challenge = await this.challengeRepository.findOne({
      where: { id: assignment.challenge_id },
    });
    if (!challenge) return null;
    await writeDailyCache(this.redisService, usuario_id, challenge);
    return { ...challenge, image: this.localImageReference(challenge.image) };
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
          selected_answers: {},
        });
      }

      // Só a primeira resposta conta e o retorno não diz se acertou (sem oráculo).
      recordFirstAnswer(record, questionId, selectedIndex);

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
            selected_answers: record.selected_answers,
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
    const record = await this.usuarioChallengeRepository.findOne({
      where: { usuario_id, challenge_id: challengeId },
    });

    return buildQuestionsPayload(challenge, questions, record);
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
    // Formato do corpo validado antes da transação; a nota usa as respostas gravadas.
    assertSubmittable(questions, dto.answers);

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
        const result = gradeChallenge(
          challenge.points,
          questions,
          mergeRecordedAnswers(dto.answers, existing?.selected_answers),
        );
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
