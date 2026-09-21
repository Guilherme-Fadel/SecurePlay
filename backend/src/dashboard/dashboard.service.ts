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
import { isFeatureEnabled } from '../config/features';
import { CompanyFeaturesService } from '../common/features/company-features.service';
import { Role } from '../auth/roles.enum';
import { loadRankingWeek, unavailableRankingWeek } from './ranking-weekly';
import { getRankingSeason, getSeasonXpByUser } from './ranking-season';
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
    private readonly companyFeatures: CompanyFeaturesService,
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
    includeWeekly = true,
    options: { includeImages?: boolean; includeEntries?: boolean } = {},
  ) {
    const includeImages = options.includeImages ?? true;
    const includeEntries = options.includeEntries ?? true;
    const parameters = await this.companyFeatures.requireFeature(
      usuario_id,
      'ranking',
    );
    const currentStats = await this.getOrCreateStats(usuario_id);
    const currentEntry = await this.statsRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.usuario', 'u')
      .leftJoinAndSelect('u.empresa', 'e')
      .where('s.usuario_id = :uid', { uid: usuario_id })
      .getOne();
    const company = currentEntry?.usuario?.empresa ?? null;
    const companyAvailable = !!company;
    const isPlatformAdmin = currentEntry?.usuario?.role === Role.PLATFORM_ADMIN;
    const globalRankingEnabled = isFeatureEnabled(parameters, 'globalRanking');
    const trialUser = !!currentEntry?.usuario?.trial_started_at;
    const scope =
      requestedScope === 'company' && companyAvailable
        ? 'company'
        : globalRankingEnabled && !trialUser
          ? 'global'
          : 'company';
    const applyScope = (
      query: SelectQueryBuilder<UsuarioStats>,
    ): SelectQueryBuilder<UsuarioStats> => {
      if (scope === 'company' && company) {
        query.andWhere('u.empresa_id = :empresaId', { empresaId: company.id });
      } else if (scope === 'company') {
        query.andWhere('1 = 0');
      } else if (!isPlatformAdmin) {
        query.andWhere(`EXISTS (
          SELECT 1 FROM empresa ranking_empresa
          WHERE ranking_empresa.id = u.empresa_id
          AND JSON_UNQUOTE(JSON_EXTRACT(ranking_empresa.parametros_funcionalidades, '$.globalRankingEnabled')) = 'true'
          AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ranking_empresa.parametros_funcionalidades, '$.rankingEnabled')), 'true') = 'true'
          AND u.trial_started_at IS NULL
        )`);
      }
      return query;
    };
    const allStats = await applyScope(
      this.statsRepository
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.usuario', 'u')
        .leftJoinAndSelect('u.empresa', 'e'),
    ).getMany();
    const seasonPoints = await getSeasonXpByUser(
      this.redisService,
      allStats.map((entry) => entry.usuario_id),
    );
    const leaderboardEntries = [...allStats]
      .sort(
        (a, b) =>
          (seasonPoints.get(b.usuario_id) ?? 0) -
            (seasonPoints.get(a.usuario_id) ?? 0) ||
          a.usuario_id - b.usuario_id,
      )
      .slice(0, 50);
    let previousPoints: number | null = null;
    let previousPosition = 0;
    const leaderboard = includeEntries
      ? await Promise.all(
          leaderboardEntries.map(async (entry, index) => {
            const points = seasonPoints.get(entry.usuario_id) ?? 0;
            if (previousPoints === null || points < previousPoints) {
              previousPosition = index + 1;
              previousPoints = points;
            }
            return {
              id: entry.usuario_id,
              position: previousPosition,
              name:
                entry.usuario_id === usuario_id
                  ? (currentEntry?.usuario?.nickname ??
                    currentEntry?.usuario?.name ??
                    'Você')
                  : (entry.usuario?.nickname ?? `Aventureiro ${entry.usuario_id}`),
              points,
              level: calcLevel(entry.total_points),
              companyName: null,
              isCurrentUser: entry.usuario_id === usuario_id,
              profileImageUrl: includeImages
                ? await this.resolveProfileImageUrl(
                    entry.usuario?.profile_image_key,
                )
              : null,
            };
          }),
        )
      : [];
    const currentSeasonPoints = seasonPoints.get(usuario_id) ?? 0;
    const currentPosition =
      allStats.filter(
        (entry) =>
          (seasonPoints.get(entry.usuario_id) ?? 0) > currentSeasonPoints,
      ).length + 1;
    const totalParticipants = allStats.length;
    const nextPoints = allStats.reduce((next, entry) => {
      const points = seasonPoints.get(entry.usuario_id) ?? 0;
      return points > currentSeasonPoints && points < next ? points : next;
    }, Infinity);
    const top = leaderboard.slice(0, 3);
    const leaderPoints = top[0]?.points ?? currentSeasonPoints;
    const pointsToNextPosition = !Number.isFinite(nextPoints)
      ? 0
      : Math.max(1, nextPoints - currentSeasonPoints + 1);
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
      points: currentSeasonPoints,
      level: calcLevel(currentStats.total_points),
      companyName: company?.nome ?? null,
      isCurrentUser: true,
      profileImageUrl: includeImages
        ? await this.resolveProfileImageUrl(
            currentEntry?.usuario?.profile_image_key,
          )
        : null,
    };
    let weekly = unavailableRankingWeek();
    if (includeWeekly) {
      try {
        weekly = await loadRankingWeek({
          redis: this.redisService,
          getScopedStats: () => Promise.resolve(allStats),
          seasonPoints,
          currentUserId: usuario_id,
          resolveProfileImageUrl: (key) => this.resolveProfileImageUrl(key),
        });
      } catch (error) {
        this.logger.warn(
          'Não foi possível calcular o histórico semanal do ranking',
          error,
        );
      }
    }
    return {
      scope,
      companyAvailable,
      company: company ? { id: company.id, name: company.nome } : null,
      totalParticipants,
      season: getRankingSeason(),
      top: top.map((entry) => ({
        ...entry,
        weeklyChange: weekly.changes?.get(entry.id) ?? null,
      })),
      leaderboard: leaderboard.map((entry) => ({
        ...entry,
        weeklyChange: weekly.changes?.get(entry.id) ?? null,
      })),
      currentUser,
      weeklyPositionChange: weekly.changes?.get(usuario_id) ?? null,
      weeklyDataAvailable: weekly.available,
      weeklyHighlights: weekly.highlights,
      summary: {
        leaderPoints,
        pointsBehindLeader: Math.max(0, leaderPoints - currentSeasonPoints),
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
    const parameters = await this.companyFeatures.forUser(usuario_id);
    const globalRankingEnabled = isFeatureEnabled(parameters, 'globalRanking');
    const ranking = globalRankingEnabled
      ? await this.getRanking(usuario_id, 'global', false, {
          includeImages: false,
          includeEntries: false,
        })
      : null;
    const totalUsers = ranking?.totalParticipants ?? null;
    const globalRanking = ranking?.currentUser.position ?? null;
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
    const previousPoints = stats.total_points;
    stats.total_points += points;
    await this.statsRepository.save(stats);
    await this.redisService.recordRankingXp(usuario_id, previousPoints, points);
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
      const previousPoints = stats.total_points;
      stats.total_points += bonusXp;
      await this.statsRepository.save(stats);
      await this.redisService.recordRankingXp(
        usuario_id,
        previousPoints,
        bonusXp,
      );
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
