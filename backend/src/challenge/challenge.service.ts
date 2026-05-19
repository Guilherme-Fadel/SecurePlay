import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Challenge } from './challenge.entity';
import { UsuarioChallenge } from '../usuario-challenge/usuario-challenge.entity';
import { RedisService } from '../redis/redis.service';
import { ttlUntilEndOfDay } from '../common/utils/date.utils';

@Injectable()
export class ChallengeService {
  constructor(
    @Inject('CHALLENGE_REPOSITORY')
    private challengeRepository: Repository<Challenge>,

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
}
