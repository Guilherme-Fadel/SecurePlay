import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { Challenge } from '../challenge/challenge.entity';
import { ChallengeService } from '../challenge/challenge.service';
import { RedisService } from '../redis/redis.service';
import { calcLevel, calcXpToNextLevel } from '../common/utils/xp.utils';
import { ttlUntilEndOfDay } from '../common/utils/date.utils';

@Injectable()
export class DashboardService {
  constructor(
    @Inject('USUARIO_STATS_REPOSITORY')
    private statsRepository: Repository<UsuarioStats>,

    private challengeService: ChallengeService,
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

    const completedChallenges = await this.challengeService.countCompleted(usuario_id);
    const totalActiveChallenges = await this.challengeService.countTotalActive();

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
    return this.challengeService.getDailyChallenge(usuario_id);
  }

  async addPoints(usuario_id: number, points: number): Promise<void> {
    const stats = await this.getOrCreateStats(usuario_id);

    stats.total_points += points;
    await this.statsRepository.save(stats);

    await this.incrementRedisXpToday(usuario_id, points);
  }
}
