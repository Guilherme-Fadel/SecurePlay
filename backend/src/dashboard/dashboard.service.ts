import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsuarioStats } from '../entities/usuario-stats/usuario-stats.entity';
import { UsuarioChallenge } from '../entities/usuario-challenge/usuario-challenge.entity';
import { Challenge } from '../entities/challenge/challenge.entity';
import { RedisService } from '../redis/redis.service';
import { calcLevel, calcXpToNextLevel } from '../common/utils/xp.utils';
import { ttlUntilEndOfDay } from '../common/utils/date.utils';

@Injectable()
export class DashboardService {
  constructor(
    @Inject('USUARIO_STATS_REPOSITORY')
    private statsRepository: Repository<UsuarioStats>,

    @Inject('USUARIO_CHALLENGE_REPOSITORY')
    private usuarioChallengeRepository: Repository<UsuarioChallenge>,

    @Inject('CHALLENGE_REPOSITORY')
    private challengeRepository: Repository<Challenge>,

    private redisService: RedisService,
  ) {}

  private async getOrCreateStats(usuario_id: number): Promise<UsuarioStats> {
    let stats = await this.statsRepository.findOne({ where: { usuario_id } });

    if (!stats) {
      stats = this.statsRepository.create({ usuario_id });
      await this.statsRepository.save(stats);
    }

    return stats;
  }

  private async getRedisXpToday(usuario_id: number): Promise<number> {
    const key = `xp-today:${usuario_id}`;
    const cached = await this.redisService.get(key);
    return cached ? parseInt(cached, 10) : 0;
  }

  private async incrementRedisXpToday(usuario_id: number, points: number): Promise<void> {
    const key = `xp-today:${usuario_id}`;
    const current = await this.getRedisXpToday(usuario_id);
    const ttl = ttlUntilEndOfDay();
    await this.redisService.set(key, String(current + points), ttl);
  }

  async getStats(usuario_id: number) {
    const stats = await this.getOrCreateStats(usuario_id);

    const completedChallenges = await this.usuarioChallengeRepository.count({
      where: { usuario_id, completed: true },
    });

    const totalActiveChallenges = await this.challengeRepository.count({
      where: { active: true },
    });

    const totalUsers = await this.statsRepository.count();

    const globalRanking = await this.statsRepository
      .createQueryBuilder('s')
      .where('s.total_points > :pts', { pts: stats.total_points })
      .getCount()
      .then((count) => count + 1);

    const xpToday = await this.getRedisXpToday(usuario_id);

    return {
      totalPoints:        stats.total_points,
      completedChallenges,
      totalActiveChallenges,
      globalRanking,
      totalUsers,
      xpToday,
      xpToNextLevel:      calcXpToNextLevel(stats.total_points),
      level:              calcLevel(stats.total_points),
    };
  }

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

  async addPoints(usuario_id: number, points: number): Promise<void> {
    const stats = await this.getOrCreateStats(usuario_id);

    stats.total_points += points;
    await this.statsRepository.save(stats);

    await this.incrementRedisXpToday(usuario_id, points);
  }
}
