import { Injectable, Inject, Logger } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { ChallengeService } from '../challenge/challenge.service';
import { RedisService } from '../redis/redis.service';
import { TokenService } from '../arcade/token.service';
import { calcLevel, calcXpToNextLevel } from '../common/utils/xp.utils';
import {
  ttlUntilEndOfDay,
  ttlUntilEndOfWeek,
  getLocalDateKey,
  getMondayOfWeek,
  getTodayWeekIndex,
} from '../common/utils/date.utils';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { S3Service } from '../conteudo/s3/s3.service';
import { ModuloService } from '../conteudo/modulo/modulo.service';
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject('USUARIO_STATS_REPOSITORY')
    private statsRepository: Repository<UsuarioStats>,
    private challengeService: ChallengeService,
    private redisService: RedisService,
    private tokenService: TokenService,
    private eventEmitter: EventEmitter2,
    private s3Service: S3Service,
    private moduloService: ModuloService,
  ) {}
  private async resolveProfileImageUrl(
    key: string | null | undefined,
  ): Promise<string | null> {
    if (!key) return null;
    try {
      return await this.s3Service.generatePresignedGetUrl(key);
    } catch {
      return null;
    }
  }
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
      .addOrderBy('s.usuario_id', 'ASC')
      .take(3);
    const topEntries = await applyScope(topEntriesQuery).getMany();
    let previousPoints: number | null = null;
    let previousPosition = 0;
    const top = await Promise.all(
      topEntries.map(async (entry, index) => {
        if (previousPoints === null || entry.total_points < previousPoints) {
          previousPosition = index + 1;
          previousPoints = entry.total_points;
        }
        return {
          id: entry.usuario_id,
          position: previousPosition,
          name:
            entry.usuario_id === usuario_id
              ? (currentEntry?.usuario?.nickname ??
                currentEntry?.usuario?.name ??
                'Você')
              : (entry.usuario?.nickname ??
                entry.usuario?.name ??
                `Aventureiro ${index + 1}`),
          points: entry.total_points,
          level: calcLevel(entry.total_points),
          companyName: null,
          isCurrentUser: entry.usuario_id === usuario_id,
          profileImageUrl: await this.resolveProfileImageUrl(
            entry.usuario?.profile_image_key,
          ),
        };
      }),
    );
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
      id: usuario_id,
      position: currentPosition,
      name:
        currentEntry?.usuario?.nickname ??
        currentEntry?.usuario?.name ??
        'Você',
      points: currentStats.total_points,
      level: calcLevel(currentStats.total_points),
      companyName: company?.nome ?? null,
      isCurrentUser: true,
      profileImageUrl: await this.resolveProfileImageUrl(
        currentEntry?.usuario?.profile_image_key,
      ),
    };
    return {
      scope,
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

  async getJourney(usuario_id: number) {
    return this.moduloService.getJourneySummary(usuario_id);
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
    await this.eventEmitter.emitAsync('progress.changed', {
      usuarioId: usuario_id,
    });
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
  /**
   * Marca o check-in do dia e atualiza a sequencia (streak).
   * Concede o bonus de XP (streak * 5) e recarrega as fichas do arcade.
   * Idempotente por dia: se ja houve check-in hoje, apenas retorna o estado atual.
   *
   * @param emitBonusEvent quando false, credita o XP do bonus sem re-emitir
   * progress.changed. Usado pelo check-in automatico, que ja e disparado
   * DENTRO do handler de progress.changed, evitando reentrada do evento.
   */
  private async registrarCheckin(usuario_id: number, emitBonusEvent: boolean) {
    const key = `streak:${usuario_id}:${getMondayOfWeek()}`;
    const raw = await this.redisService.get(key);
    const checkedDays: boolean[] = raw
      ? JSON.parse(raw)
      : [false, false, false, false, false, false, false];
    const todayIndex = getTodayWeekIndex();
    if (checkedDays[todayIndex]) {
      const stats = await this.getOrCreateStats(usuario_id);
      return {
        alreadyChecked: true,
        message: 'Você já fez check-in hoje!',
        checkedDays,
        streak: stats.current_streak,
        bonusXp: 0,
      };
    }
    checkedDays[todayIndex] = true;
    const ttl = ttlUntilEndOfWeek();
    await this.redisService.set(key, JSON.stringify(checkedDays), ttl);
    const stats = await this.getOrCreateStats(usuario_id);
    const todayStr = getLocalDateKey();
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
    if (emitBonusEvent) {
      await this.addPoints(usuario_id, bonusXp);
    } else {
      // credita direto (sem emitir progress.changed) para nao reentrar no handler
      stats.total_points += bonusXp;
      await this.statsRepository.save(stats);
      await this.incrementRedisXpToday(usuario_id, bonusXp);
    }
    await this.tokenService.refillToCap(usuario_id);
    return {
      alreadyChecked: false,
      message: `Check-in realizado! +${bonusXp} XP (${streak === 1 ? 'dia consecutivo' : 'dias consecutivos'}!)`,
      checkedDays,
      streak,
      bonusXp,
    };
  }

  /**
   * Check-in automatico: disparado quando o usuario finaliza qualquer atividade
   * que gera progresso (aula, quiz, desafio diario ou jogo do arcade).
   * Escuta progress.changed e marca o check-in do dia uma unica vez.
   */
  @OnEvent('progress.changed')
  async handleProgressChanged(payload: { usuarioId: number }): Promise<void> {
    try {
      await this.registrarCheckin(payload.usuarioId, false);
    } catch (error) {
      this.logger.error(
        `Falha no check-in automatico do usuario ${payload?.usuarioId}: ${error?.message}`,
      );
    }
  }
}
