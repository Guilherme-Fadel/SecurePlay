import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Challenge } from './challenge.entity';
import { Question } from '../question/question.entity';
import { UsuarioChallenge } from '../usuario-challenge/usuario-challenge.entity';
import { RedisService } from '../redis/redis.service';
import { ttlUntilEndOfDay } from '../common/utils/date.utils';

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
  ) {}

  async getDailyChallenge(usuario_id: number): Promise<Challenge | null> {
    const cached = await this.getRedisDailyChallenge(usuario_id);
    if (cached) return cached;

    const completedIds = await this.usuarioChallengeRepository
      .find({ where: { usuario_id, completed: true }, select: ['challenge_id'] })
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
      where: { usuario_id, completed: true },
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
}
