import { Injectable, Inject, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { Usuario } from '../usuario/usuario.entity';
import { ChallengeService } from '../challenge/challenge.service';
import { RedisService } from '../redis/redis.service';
import { DailyCheckinService } from './daily-checkin.service';
import { calcLevel, calcXpToNextLevel } from '../common/utils/xp.utils';
import { ttlUntilEndOfDay } from '../common/utils/date.utils';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { S3Service } from '../conteudo/s3/s3.service';
import { ModuloService } from '../conteudo/modulo/modulo.service';
import { isFeatureEnabled, type CompanyParameters } from '../config/features';
import { CompanyFeaturesService } from '../common/features/company-features.service';
import { Role } from '../auth/roles.enum';
import { loadRankingWeek, unavailableRankingWeek } from './ranking-weekly';
import { getRankingSeason, getSeasonXpByUser } from './ranking-season';
import { rankDisplayName, rankKey } from './rank-key';
import { Empresa } from '../empresa/empresa.entity';
import { creditSeasonXp } from '../common/gamification/credit-season-xp';
import { closeRankingSeason, ensurePendingRankingSeasonsClosed, historicalSeason, loadSeasonPoints, rankingHistoryContext, RankingMode } from './ranking-history';
/** Participantes do escopo e pontos usados para ordenar o ranking. */
interface RankingDataset {
  allStats: UsuarioStats[];
  seasonPoints: Map<number, number>;
  historicalCompanies: Map<number, string | null>;
}
const RANKING_DATASET_TTL_MS = 30_000;
const RANKING_DATASET_MAX_KEYS = 500;

@Injectable()
export class DashboardService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DashboardService.name);
  private readonly rankingDatasets = new Map<
    string,
    { expiresAt: number; data: Promise<RankingDataset> }
  >();
  private closeTimer: NodeJS.Timeout | null = null;
  private closeTask: Promise<void> | null = null;
  private shuttingDown = false;

  constructor(
    @Inject('USUARIO_STATS_REPOSITORY')
    private statsRepository: Repository<UsuarioStats>,
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
    private challengeService: ChallengeService,
    private redisService: RedisService,
    private checkins: DailyCheckinService,
    private eventEmitter: EventEmitter2,
    private s3Service: S3Service,
    private moduloService: ModuloService,
    private readonly companyFeatures: CompanyFeaturesService,
  ) {}
  async onModuleInit(): Promise<void> {
    // Conclui temporadas pendentes antes que a aplicação aceite requests.
    await ensurePendingRankingSeasonsClosed(this.dataSource);
    this.scheduleNextClose();
  }
  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = null;
    if (this.closeTask) await this.closeTask;
  }
  private scheduleNextClose(retryDelay?: number): void {
    if (this.shuttingDown) return;
    const nextMonth = new Date(getRankingSeason().endsAt).getTime();
    // Um mês excede o limite seguro de setTimeout; rearmamos a cada 24 horas.
    const delay = retryDelay ?? Math.max(1000, Math.min(24 * 60 * 60 * 1000, nextMonth - Date.now() + 1000));
    this.closeTimer = setTimeout(() => { void this.runScheduledClose(); }, delay);
    this.closeTimer.unref?.();
  }
  private async runScheduledClose(): Promise<void> {
    this.closeTimer = null;
    this.closeTask = ensurePendingRankingSeasonsClosed(this.dataSource);
    let failed = false;
    try {
      await this.closeTask;
    } catch (error) {
      failed = true;
      this.logger.error('Falha no fechamento agendado do ranking', error);
    } finally {
      this.closeTask = null;
      this.scheduleNextClose(failed ? 60_000 : undefined);
    }
  }
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
    const ttl = ttlUntilEndOfDay();
    await this.redisService.incrBy(key, points, ttl);
  }
  async getRanking(
    usuario_id: number,
    requestedScope: 'global' | 'company' = 'global',
    includeWeekly = true,
    options: { includeImages?: boolean; includeEntries?: boolean; companyId?: number; mode?: RankingMode; selectedSeason?: string | null; parameters?: CompanyParameters } = {},
  ) {
    const mode = options.mode ?? 'current';
    const selectedSeason = options.selectedSeason ?? (mode === 'current' ? getRankingSeason().startsAt.slice(0, 7) : null);
    const includeImages = options.includeImages ?? true;
    const includeEntries = options.includeEntries ?? true;
    // Etapa 1 em paralelo: cada ida ao banco custa a latência de rede.
    const [parameters, currentEntry] = await Promise.all([
      // Quem já resolveu as funcionalidades da empresa (ex.: getStats) as repassa e poupa a consulta.
      options.parameters
        ? this.requireRankingParameters(options.parameters)
        : this.companyFeatures.requireFeature(usuario_id, 'ranking'),
      this.statsRepository
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.usuario', 'u')
        .leftJoinAndSelect('u.empresa', 'e')
        .where('s.usuario_id = :uid', { uid: usuario_id })
        .getOne(),
    ]);
    const currentUserRecord = currentEntry?.usuario ?? await this.dataSource.getRepository(Usuario).findOne({ where: { id: usuario_id }, relations: ['empresa'] });
    const isManagementUser =
      currentUserRecord?.role === Role.ADMIN ||
      currentUserRecord?.role === Role.TEACHER ||
      currentUserRecord?.role === Role.PLATFORM_ADMIN;
    const company = isManagementUser && currentUserRecord?.role === Role.PLATFORM_ADMIN && options.companyId
      ? await this.dataSource.getRepository(Empresa).findOne({ where: { id: options.companyId } })
      : currentUserRecord?.empresa ?? null;
    const companyAvailable = !!company;
    const globalRankingEnabled = isFeatureEnabled(parameters, 'globalRanking');
    const trialUser = !!currentUserRecord?.trial_started_at;
    const scope =
      requestedScope === 'company' && companyAvailable
        ? 'company'
        : globalRankingEnabled && !trialUser
          ? 'global'
          : 'company';
    const applyScope = (
      query: SelectQueryBuilder<UsuarioStats>,
    ): SelectQueryBuilder<UsuarioStats> => {
      query.andWhere('u.role = :rankingRole', { rankingRole: Role.USER });
      if (scope === 'company' && company) {
        query.andWhere('u.empresa_id = :empresaId', { empresaId: company.id });
      } else if (scope === 'company') {
        query.andWhere('1 = 0');
      } else {
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
    if (mode === 'season' && selectedSeason) await closeRankingSeason(this.dataSource, selectedSeason);
    // Etapa 2 em paralelo: estatísticas do usuário e contexto histórico.
    const [currentStats, history] = await Promise.all([
      isManagementUser ? Promise.resolve(null) : this.getOrCreateStats(usuario_id),
      rankingHistoryContext(this.dataSource, mode, selectedSeason),
    ]);
    // M1: o conjunto do escopo é compartilhado por 30 s entre requisições (inclusive as
    // simultâneas) e descartado quando o progresso muda; a posição do aluno segue por requisição.
    const datasetKey = [
      mode,
      scope,
      scope === 'company' ? (company?.id ?? 0) : 0,
      selectedSeason ?? '',
      history.dataCompleteness,
    ].join('|');
    const { allStats, seasonPoints, historicalCompanies } =
      await this.cachedRankingDataset(datasetKey, () =>
        this.loadRankingDataset({
          mode,
          scope,
          companyId: company?.id ?? -1,
          selectedSeason,
          complete: history.dataCompleteness === 'complete',
          applyScope,
        }),
      );
    const leaderboardEntries = [...allStats]
      .sort(
        (a, b) =>
          (seasonPoints.get(b.usuario_id) ?? 0) -
            (seasonPoints.get(a.usuario_id) ?? 0) ||
          a.usuario_id - b.usuario_id,
      )
      .slice(0, 50);
    const historicalCurrentEntry = mode === 'season' ? allStats.find((entry) => entry.usuario_id === usuario_id) : null;
    let previousPoints: number | null = null;
    let previousPosition = 0;
    // M5: no ranking global, foto só de alunos da mesma escola de quem consulta.
    const showPhoto = (entry: UsuarioStats) =>
      scope === 'company' ||
      entry.usuario_id === usuario_id ||
      (!!company && entry.usuario?.empresa_id === company.id);
    const leaderboard = includeEntries
      ? await Promise.all(
          leaderboardEntries.map(async (entry, index) => {
            const points = seasonPoints.get(entry.usuario_id) ?? 0;
            if (previousPoints === null || points < previousPoints) {
              previousPosition = index + 1;
              previousPoints = points;
            }
            return {
              usuarioId: entry.usuario_id,
              rankKey: rankKey(entry.usuario_id),
              position: previousPosition,
              name:
                mode === 'season'
                  ? rankDisplayName(entry.usuario?.nickname, entry.usuario_id)
                  : entry.usuario_id === usuario_id
                  ? (currentEntry?.usuario?.nickname ??
                    currentEntry?.usuario?.name ??
                    'Você')
                  : rankDisplayName(entry.usuario?.nickname, entry.usuario_id),
              points,
              level: calcLevel(entry.total_points),
              companyName: mode === 'season' ? historicalCompanies.get(entry.usuario_id) ?? null : null,
              isCurrentUser: entry.usuario_id === usuario_id,
              profileImageUrl:
                includeImages && showPhoto(entry)
                  ? await this.resolveProfileImageUrl(
                      entry.usuario?.profile_image_key,
                    )
                  : null,
            };
          }),
        )
      : [];
    const viewerInRanking = allStats.some((entry) => entry.usuario_id === usuario_id);
    const currentSeasonPoints = isManagementUser ? 0 : (seasonPoints.get(usuario_id) ?? 0);
    const currentPosition = isManagementUser || (mode === 'season' && !viewerInRanking) ? null : allStats.filter((entry) => (seasonPoints.get(entry.usuario_id) ?? 0) > currentSeasonPoints).length + 1;
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
    const percentile = isManagementUser ? null :
      totalParticipants <= 1
        ? 100
        : Math.max(
            0,
            Math.round(
              ((totalParticipants - (currentPosition ?? 0)) /
                (totalParticipants - 1)) *
                100,
            ),
          );
    const currentUser = isManagementUser || (mode === 'season' && !viewerInRanking) ? null : {
      rankKey: rankKey(usuario_id),
      position: currentPosition,
      name: mode === 'season' ? historicalCurrentEntry?.usuario?.nickname ?? 'Você' :
        currentEntry?.usuario?.nickname ?? currentEntry?.usuario?.name ?? 'Você',
      points: currentSeasonPoints,
      level: calcLevel(mode === 'season' ? historicalCurrentEntry?.total_points ?? 0 : currentStats!.total_points),
      companyName: mode === 'season' ? historicalCompanies.get(usuario_id) ?? null : company?.nome ?? null,
      isCurrentUser: true,
      profileImageUrl: includeImages
        ? await this.resolveProfileImageUrl(
            mode === 'season' ? historicalCurrentEntry?.usuario?.profile_image_key : currentEntry?.usuario?.profile_image_key,
          )
        : null,
    };
    let weekly = unavailableRankingWeek();
    if (includeWeekly && mode === 'current') {
      try {
        weekly = await loadRankingWeek({
          redis: this.redisService,
          getScopedStats: () => Promise.resolve(allStats),
          seasonPoints,
      currentUserId: isManagementUser ? 0 : usuario_id,
          resolveProfileImageUrl: (key) => this.resolveProfileImageUrl(key),
          showPhoto,
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
      season: mode === 'season' && selectedSeason ? historicalSeason(selectedSeason) : getRankingSeason(),
      mode,
      metric: mode === 'total' ? 'totalXp' as const : 'seasonXp' as const,
      selectedSeason,
      availableSeasons: history.availableSeasons,
      dataCompleteness: history.dataCompleteness,
      top: top.map(({ usuarioId, ...entry }) => ({
        ...entry,
        weeklyChange: weekly.changes?.get(usuarioId) ?? null,
      })),
      leaderboard: leaderboard.map(({ usuarioId, ...entry }) => ({
        ...entry,
        weeklyChange: weekly.changes?.get(usuarioId) ?? null,
      })),
      currentUser,
      viewerParticipates: !isManagementUser && (mode !== 'season' || viewerInRanking),
      weeklyPositionChange: isManagementUser || mode !== 'current' ? null : (weekly.changes?.get(usuario_id) ?? null),
      weeklyDataAvailable: weekly.available,
      weeklyHighlights: weekly.highlights,
      summary: {
        leaderPoints,
        pointsBehindLeader: isManagementUser ? null : Math.max(0, leaderPoints - currentSeasonPoints),
        pointsToNextPosition: isManagementUser ? null : pointsToNextPosition,
        percentile,
      },
    };
  }

  /** Participantes do escopo e pontos de cada um, no modo pedido (carga sem cache). */
  private async loadRankingDataset(options: {
    mode: RankingMode;
    scope: 'global' | 'company';
    companyId: number;
    selectedSeason: string | null;
    complete: boolean;
    applyScope: (
      query: SelectQueryBuilder<UsuarioStats>,
    ) => SelectQueryBuilder<UsuarioStats>;
  }): Promise<RankingDataset> {
    if (options.mode === 'season') {
      const rows = options.complete
        ? ((await this.dataSource.query(
            `SELECT * FROM ranking_season_snapshot WHERE season_id = ? AND ${options.scope === 'company' ? 'empresa_id = ?' : 'global_eligible = 1'}`,
            options.scope === 'company'
              ? [options.selectedSeason, options.companyId]
              : [options.selectedSeason],
          )) as Array<{
            usuario_id: number;
            points: number;
            total_points: number;
            display_name: string;
            profile_image_key: string | null;
            empresa_id: number | null;
            empresa_nome: string | null;
          }>)
        : [];
      return {
        allStats: rows.map(
          (row) =>
            ({
              usuario_id: row.usuario_id,
              total_points: row.total_points,
              usuario: {
                nickname: row.display_name,
                name: row.display_name,
                profile_image_key: row.profile_image_key,
                empresa_id: row.empresa_id,
              },
            }) as UsuarioStats,
        ),
        seasonPoints: new Map(
          rows.map((row) => [Number(row.usuario_id), Number(row.points)]),
        ),
        historicalCompanies: new Map(
          rows.map((row) => [Number(row.usuario_id), row.empresa_nome]),
        ),
      };
    }
    const allStats = await options
      .applyScope(
        this.statsRepository
          .createQueryBuilder('s')
          .leftJoinAndSelect('s.usuario', 'u')
          .leftJoinAndSelect('u.empresa', 'e'),
      )
      .getMany();
    const ids = allStats.map((entry) => entry.usuario_id);
    const seasonPoints =
      options.mode === 'total'
        ? new Map(
            allStats.map((entry) => [entry.usuario_id, entry.total_points]),
          )
        : options.complete
          ? await loadSeasonPoints(
              this.dataSource,
              options.selectedSeason!,
              ids,
            )
          : await getSeasonXpByUser(this.redisService, ids);
    return { allStats, seasonPoints, historicalCompanies: new Map() };
  }

  /** Conjunto do ranking por modo/escopo/escola/temporada, com cache curto e requisições somadas. */
  private cachedRankingDataset(
    key: string,
    load: () => Promise<RankingDataset>,
  ): Promise<RankingDataset> {
    const now = Date.now();
    const hit = this.rankingDatasets.get(key);
    if (hit && hit.expiresAt > now) return hit.data;
    if (this.rankingDatasets.size >= RANKING_DATASET_MAX_KEYS)
      this.rankingDatasets.clear();
    const data = load();
    this.rankingDatasets.set(key, {
      expiresAt: now + RANKING_DATASET_TTL_MS,
      data,
    });
    data.catch(() => this.rankingDatasets.delete(key));
    return data;
  }

  private requireRankingParameters(parameters: CompanyParameters) {
    if (!isFeatureEnabled(parameters, 'ranking')) {
      throw new NotFoundException(
        'Funcionalidade não disponível para sua empresa',
      );
    }
    return Promise.resolve(parameters);
  }

  async getJourney(usuario_id: number) {
    return this.moduloService.getJourneySummary(usuario_id);
  }
  async getStats(usuario_id: number) {
    // Consultas independentes em paralelo: cada ida ao banco tem custo de rede.
    const parameters = await this.companyFeatures.forUser(usuario_id);
    const globalRankingEnabled = isFeatureEnabled(parameters, 'globalRanking');
    const rankingPromise: Promise<Awaited<
      ReturnType<typeof this.getRanking>
    > | null> = globalRankingEnabled
      ? this.getRanking(usuario_id, 'global', false, {
          includeImages: false,
          includeEntries: false,
          parameters,
        }).catch((error: unknown) => {
          if (error instanceof NotFoundException) return null;
          throw error;
        })
      : Promise.resolve(null);
    const [stats, completedChallenges, totalActiveChallenges, xpToday, ranking] =
      await Promise.all([
        this.getOrCreateStats(usuario_id),
        this.challengeService.countCompleted(usuario_id),
        this.challengeService.countTotalActive(),
        this.getRedisXpToday(usuario_id),
        rankingPromise,
      ]);
    const totalUsers = ranking?.totalParticipants ?? null;
    const globalRanking = ranking?.currentUser?.position ?? null;
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
    if (!Number.isSafeInteger(points) || points <= 0) throw new Error('XP deve ser positivo');
    const previousPoints = await creditSeasonXp(this.statsRepository, usuario_id, points);
    await this.redisService.recordRankingXp(usuario_id, previousPoints, points);
    await this.incrementRedisXpToday(usuario_id, points);
    await this.eventEmitter.emitAsync('progress.changed', {
      usuarioId: usuario_id,
    });
  }
  async getWeeklyStreak(usuario_id: number) {
    return this.checkins.weekly(usuario_id);
  }

  @OnEvent('progress.changed', { suppressErrors: false })
  async handleProgressChanged(payload: {
    usuarioId: number;
    skipCheckin?: boolean;
    checkinDay?: string;
  }): Promise<void> {
    // XP mudou: o próximo ranking deste processo é recalculado.
    this.rankingDatasets.clear();
    if (payload.skipCheckin) return;
    if (payload.checkinDay) {
      await this.checkins.registerForDay(payload.usuarioId, payload.checkinDay);
    } else {
      await this.checkins.register(payload.usuarioId);
    }
  }
}
