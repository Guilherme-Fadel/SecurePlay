import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Challenge } from './challenge.entity';
import { Question } from '../question/question.entity';
import { UsuarioChallenge } from '../usuario-challenge/usuario-challenge.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { RedisService } from '../redis/redis.service';
import { ttlUntilEndOfDay } from '../common/utils/date.utils';
import { SubmitChallengeDto } from './dto/challenge.dto';

@Injectable()
export class ChallengeService {
  constructor(
    @Inject('CHALLENGE_REPOSITORY')
    private challengeRepository: Repository<Challenge>,

    @Inject('QUESTION_REPOSITORY')
    private questionRepository: Repository<Question>,

    @Inject('USUARIO_CHALLENGE_REPOSITORY')
    private usuarioChallengeRepository: Repository<UsuarioChallenge>,

    @Inject('USUARIO_STATS_REPOSITORY')
    private statsRepository: Repository<UsuarioStats>,

    private redisService: RedisService,
  ) {}

  async getDailyChallenge(usuario_id: number): Promise<Challenge | null> {
    const cached = await this.getRedisDailyChallenge(usuario_id);
    if (cached) return cached;

    const completedIds = await this.usuarioChallengeRepository
      .find({ where: { usuario_id }, select: ['challenge_id'] })
      .then((rows) => rows.map((r) => r.challenge_id));

    const query = this.challengeRepository
      .createQueryBuilder('c')
      .where('c.active = :active', { active: true });

    if (completedIds.length > 0) {
      query.andWhere('c.id NOT IN (:...completedIds)', { completedIds });
    }

    const challenge = await query
      .orderBy('RAND()')
      .getOne();

    if (challenge) {
      await this.setRedisDailyChallenge(usuario_id, challenge);
    }

    return challenge;
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

  private async getRedisDailyChallenge(usuario_id: number): Promise<Challenge | null> {
    const cacheKey = `daily-challenge:${usuario_id}`;
    const cached = await this.redisService.get(cacheKey);
    return cached ? (JSON.parse(cached) as Challenge) : null;
  }

  private async setRedisDailyChallenge(usuario_id: number, challenge: Challenge): Promise<void> {
    const cacheKey = `daily-challenge:${usuario_id}`;
    const ttl = ttlUntilEndOfDay();
    await this.redisService.set(cacheKey, JSON.stringify(challenge), ttl);
  }

  async getStatus(challengeId: number, usuario_id: number) {
    const record = await this.usuarioChallengeRepository.findOne({
      where: { usuario_id, challenge_id: challengeId },
    });

    const totalQuestions = await this.questionRepository.count({
      where: { challenge_id: challengeId },
    });

    const answeredIds = record?.answered_question_ids ?? [];
    const answeredCount = record?.completed ? totalQuestions : answeredIds.length;

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
    const question = await this.questionRepository.findOne({
      where: { id: questionId, challenge_id: challengeId },
    });

    if (!question) {
      throw new NotFoundException('Questão não encontrada para este desafio');
    }

    let record = await this.usuarioChallengeRepository.findOne({
      where: { usuario_id, challenge_id: challengeId },
    });

    if (record?.completed) {
      throw new BadRequestException('Desafio já concluído');
    }

    if (!record) {
      record = this.usuarioChallengeRepository.create({
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

    const totalQuestions = await this.questionRepository.count({
      where: { challenge_id: challengeId },
    });
    record.progress =
      totalQuestions > 0
        ? Math.round((record.answered_question_ids.length / totalQuestions) * 100)
        : 0;

    await this.usuarioChallengeRepository.save(record);

    return {
      correct: isCorrect,
      answeredCount: record.answered_question_ids.length,
      totalQuestions,
      progress: record.progress,
      completed: false,
    };
  }

  async getQuestions(challengeId: number) {
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
      },
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        order: q.order,
      })),
    };
  }

  async submitChallenge(challengeId: number, usuario_id: number, dto: SubmitChallengeDto) {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId, active: true },
    });

    if (!challenge) {
      throw new NotFoundException('Desafio não encontrado');
    }

    const existing = await this.usuarioChallengeRepository.findOne({
      where: { usuario_id, challenge_id: challengeId },
    });

    if (existing?.completed) {
      throw new BadRequestException('Você já realizou este desafio');
    }

    const questions = await this.questionRepository.find({
      where: { challenge_id: challengeId },
    });

    if (questions.length === 0) {
      throw new NotFoundException('Nenhuma pergunta encontrada para este desafio');
    }

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    let correctCount = 0;
    const corrections = dto.answers.map((answer) => {
      const question = questionMap.get(answer.questionId);

      if (!question) {
        return { questionId: answer.questionId, correct: false, correctIndex: -1, explanation: null };
      }

      const isCorrect = answer.selectedIndex === question.correct_index;
      if (isCorrect) correctCount++;

      return {
        questionId: question.id,
        correct: isCorrect,
        correctIndex: question.correct_index,
        explanation: question.explanation,
      };
    });

    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const pointsEarned = Math.round(challenge.points * (score / 100));

    const usuarioChallenge = existing ?? this.usuarioChallengeRepository.create({
      usuario_id,
      challenge_id: challengeId,
      answered_question_ids: [],
    });
    usuarioChallenge.progress = score;
    usuarioChallenge.completed = true;
    usuarioChallenge.completed_at = new Date();

    await this.usuarioChallengeRepository.save(usuarioChallenge);

    if (pointsEarned > 0) {
      let stats = await this.statsRepository.findOne({ where: { usuario_id } });
      if (!stats) {
        stats = this.statsRepository.create({ usuario_id });
      }
      stats.total_points += pointsEarned;
      await this.statsRepository.save(stats);

      const xpKey = `xp-today:${usuario_id}`;
      const currentXp = await this.redisService.get(xpKey);
      const newXp = (currentXp ? parseInt(currentXp, 10) : 0) + pointsEarned;
      const ttl = ttlUntilEndOfDay();
      await this.redisService.set(xpKey, String(newXp), ttl);
    }

    return {
      score,
      correctCount,
      totalQuestions,
      pointsEarned,
      completed: true,
      corrections,
    };
  }
}
