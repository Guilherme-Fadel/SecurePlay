import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsuarioStats } from '../entities/usuario-stats/usuario-stats.entity';
import { UsuarioChallenge } from '../entities/usuario-challenge/usuario-challenge.entity';

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

  async addPoints(usuario_id: number, points: number): Promise<void> {
    const stats = await this.getOrCreateStats(usuario_id);

    stats.total_points += points;
    stats.xp_today     += points;

    await this.statsRepository.save(stats);
  }

}
