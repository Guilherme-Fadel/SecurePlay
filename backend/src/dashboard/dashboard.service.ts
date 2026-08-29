import { Injectable, Inject } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { ChallengeService } from '../challenge/challenge.service';
import { RedisService } from '../redis/redis.service';
import { TokenService } from '../arcade/token.service';
import { calcLevel, calcXpToNextLevel } from '../common/utils/xp.utils';
import {
  ttlUntilEndOfDay,
  ttlUntilEndOfWeek,
  getMondayOfWeek,
  getTodayWeekIndex,
  now,
} from '../common/utils/date.utils';
@Injectable()
export class DashboardService {
  constructor(
    @Inject('USUARIO_STATS_REPOSITORY')
    private statsRepository: Repository<UsuarioStats>,
    private challengeService: ChallengeService,
    private redisService: RedisService,
    private tokenService: TokenService,
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
  private async incrementRedisXpToday(
    usuario_id: number,
    points: number,
  ): Promise<void> {
    const key = `xp-today:${usuario_id}`;
    const current = await this.getRedisXpToday(usuario_id);
    const ttl = ttlUntilEndOfDay();
    await this.redisService.set(key, String(current + points), ttl);
  }
  async getRanking(
    usuario_id: number,
    requestedScope: 'global' | 'company' = 'global',
  ) {
    const currentStats = await this.getOrCreateStats(usuario_id);
    const currentEntry = await this.statsRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.usuario', 'u')
      .leftJoinAndSelect('u.empresa', 'e')
      .where('s.usuario_id = :uid', { uid: usuario_id })
      .getOne();
    const company = currentEntry?.usuario?.empresa ?? null;
    const companyAvailable = !!company;
    const scope =
      requestedScope === 'company' && companyAvailable ? 'company' : 'global';
    const applyScope = (
      query: SelectQueryBuilder<UsuarioStats>,
    ): SelectQueryBuilder<UsuarioStats> => {
      if (scope === 'company' && company) {
        query.andWhere('u.empresa_id = :empresaId', { empresaId: company.id });
      }
      return query;
    };
    const topEntriesQuery = this.statsRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.usuario', 'u')
      .leftJoinAndSelect('u.empresa', 'e')
      .orderBy('s.total_points', 'DESC')
      .addOrderBy('s.updated_at', 'ASC')
      .take(20);
    const topEntries = await applyScope(topEntriesQuery).getMany();
    let previousPoints: number | null = null;
    let previousPosition = 0;
    const top = topEntries.map((entry, index) => {
      if (previousPoints === null || entry.total_points < previousPoints) {
        previousPosition = index + 1;
        previousPoints = entry.total_points;
      }
      return {
        position: previousPosition,
        name: entry.usuario?.name ?? 'Usuário',
        points: entry.total_points,
        level: calcLevel(entry.total_points),
        companyName: entry.usuario?.empresa?.nome ?? null,
        isCurrentUser: entry.usuario_id === usuario_id,
      };
    });
    const higherCountQuery = this.statsRepository
      .createQueryBuilder('s')
      .innerJoin('s.usuario', 'u')
      .where('s.total_points > :pts', { pts: currentStats.total_points });
    const higherCount = await applyScope(higherCountQuery).getCount();
    const currentPosition = higherCount + 1;
    const totalParticipantsQuery = this.statsRepository
      .createQueryBuilder('s')
      .innerJoin('s.usuario', 'u');
    const totalParticipants = await applyScope(
      totalParticipantsQuery,
    ).getCount();
    const nextEntryQuery = this.statsRepository
      .createQueryBuilder('s')
      .innerJoin('s.usuario', 'u')
      .select('s.total_points', 'points')
      .where('s.total_points > :pts', { pts: currentStats.total_points })
      .orderBy('s.total_points', 'ASC')
      .limit(1);
    const nextEntry = await applyScope(nextEntryQuery).getRawOne<{
      points: number | string;
    }>();
    const leaderPoints = top[0]?.points ?? currentStats.total_points;
    const nextPoints = nextEntry ? Number(nextEntry.points) : null;
    const pointsToNextPosition =
      nextPoints === null
        ? 0
        : Math.max(1, nextPoints - currentStats.total_points + 1);
    const percentile =
      totalParticipants <= 1
        ? 100
        : Math.max(
            0,
            Math.round(
              ((totalParticipants - currentPosition) /
                (totalParticipants - 1)) *
                100,
            ),
          );
    const currentUser = {
      position: currentPosition,
      name: currentEntry?.usuario?.name ?? 'Você',
      points: currentStats.total_points,
      level: calcLevel(currentStats.total_points),
      companyName: company?.nome ?? null,
      isCurrentUser: true,
    };
    return {
      scope,
      scopeLabel:
        scope === 'company' && company ? company.nome : 'Comunidade global',
      companyAvailable,
      company: company ? { id: company.id, name: company.nome } : null,
      totalParticipants,
      top,
      currentUser,
      summary: {
        leaderPoints,
        pointsBehindLeader: Math.max(
          0,
          leaderPoints - currentStats.total_points,
        ),
        pointsToNextPosition,
        percentile,
      },
    };
  }
  async getStats(usuario_id: number) {
    const stats = await this.getOrCreateStats(usuario_id);
    const completedChallenges =
      await this.challengeService.countCompleted(usuario_id);
    const totalActiveChallenges =
      await this.challengeService.countTotalActive();
    const totalUsers = await this.statsRepository.count();
    const globalRanking = await this.statsRepository
      .createQueryBuilder('s')
      .where('s.total_points > :pts', { pts: stats.total_points })
      .getCount()
      .then((count) => count + 1);
    const xpToday = await this.getRedisXpToday(usuario_id);
    return {
      totalPoints: stats.total_points,
      completedChallenges,
      totalActiveChallenges,
      globalRanking,
      totalUsers,
      xpToday,
      xpToNextLevel: calcXpToNextLevel(stats.total_points),
      level: calcLevel(stats.total_points),
    };
  }
  async addPoints(usuario_id: number, points: number): Promise<void> {
    const stats = await this.getOrCreateStats(usuario_id);
    stats.total_points += points;
    await this.statsRepository.save(stats);
    await this.incrementRedisXpToday(usuario_id, points);
  }
  async getWeeklyStreak(usuario_id: number) {
    const key = `streak:${usuario_id}:${getMondayOfWeek()}`;
    const raw = await this.redisService.get(key);
    const checkedDays: boolean[] = raw
      ? JSON.parse(raw)
      : [false, false, false, false, false, false, false];
    const todayIndex = getTodayWeekIndex();
    const stats = await this.getOrCreateStats(usuario_id);
    return {
      checkedDays,
      todayIndex,
      streak: stats.current_streak,
      checkedToday: checkedDays[todayIndex],
    };
  }
  async performCheckin(usuario_id: number) {
    const key = `streak:${usuario_id}:${getMondayOfWeek()}`;
    const raw = await this.redisService.get(key);
    const checkedDays: boolean[] = raw
      ? JSON.parse(raw)
      : [false, false, false, false, false, false, false];
    const todayIndex = getTodayWeekIndex();
    if (checkedDays[todayIndex]) {
      const stats = await this.getOrCreateStats(usuario_id);
      return {
        message: 'Você já fez check-in hoje!',
        checkedDays,
        streak: stats.current_streak,
      };
    }
    checkedDays[todayIndex] = true;
    const ttl = ttlUntilEndOfWeek();
    await this.redisService.set(key, JSON.stringify(checkedDays), ttl);
    const stats = await this.getOrCreateStats(usuario_id);
    const today = now();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (stats.last_checkin_date) {
      const lastDate = new Date(stats.last_checkin_date + 'T00:00:00');
      const todayDate = new Date(todayStr + 'T00:00:00');
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) {
        stats.current_streak += 1;
      } else if (diffDays > 1) {
        stats.current_streak = 1;
      }
    } else {
      stats.current_streak = 1;
    }
    stats.last_checkin_date = todayStr;
    await this.statsRepository.save(stats);
    const streak = stats.current_streak;
    const bonusXp = streak * 5;
    await this.addPoints(usuario_id, bonusXp);
    await this.tokenService.refillToCap(usuario_id);
    return {
      message: `Check-in realizado! +${bonusXp} XP (${streak === 1 ? 'dia consecutivo' : 'dias consecutivos'}!)`,
      checkedDays,
      streak,
      bonusXp,
    };
  }
}
