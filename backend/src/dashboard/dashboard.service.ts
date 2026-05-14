import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsuarioStats } from '../entities/usuario-stats/usuario-stats.entity';
import { UsuarioChallenge } from '../entities/usuario-challenge/usuario-challenge.entity';
import { Challenge } from '../entities/challenge/challenge.entity';
import { RedisService } from '../redis/redis.service';

const XP_PER_LEVEL = 1000;

function calcLevel(totalPoints: number): number {
  return Math.floor(totalPoints / XP_PER_LEVEL) + 1;
}

function calcXpToNextLevel(totalPoints: number): number {
  return XP_PER_LEVEL - (totalPoints % XP_PER_LEVEL);
}

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

  async getStats(usuario_id: number) {
    const stats = await this.getOrCreateStats(usuario_id);

    const completedChallenges = await this.usuarioChallengeRepository.count({
      where: { usuario_id, completed: true },
    });

    const globalRanking = await this.statsRepository
      .createQueryBuilder('s')
      .where('s.total_points > :pts', { pts: stats.total_points })
      .getCount()
      .then((count) => count + 1);

    return {
      totalPoints:        stats.total_points,
      completedChallenges,
      globalRanking,
      xpToday:            stats.xp_today,
      xpToNextLevel:      calcXpToNextLevel(stats.total_points),
      level:              calcLevel(stats.total_points),
    };
  }

  async getDailyChallenge(usuario_id: number): Promise<Challenge | null> {
    const cacheKey = `daily-challenge:${usuario_id}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Challenge;
    }

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
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const ttl = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);

      await this.redisService.set(cacheKey, JSON.stringify(challenge), ttl);
    }

    return challenge;
  }

  async addPoints(usuario_id: number, points: number): Promise<void> {
    const stats = await this.getOrCreateStats(usuario_id);

    stats.total_points += points;
    stats.xp_today     += points;

    await this.statsRepository.save(stats);
  }

}
