import { DashboardService } from './dashboard.service';
import { rankKey } from './rank-key';
import { NotFoundException } from '@nestjs/common';
import { Role } from '../auth/roles.enum';
import { getRankingWeekStart } from './ranking-season';
import {
  CompanyParameters,
  isFeatureEnabled,
  noCompanyParameters,
  platformAdminParameters,
  resolveCompanyParameters,
} from '../config/features';

describe('DashboardService company parameters', () => {
  function buildService(
    company: { id: number; nome: string } | null,
    overrides?: Partial<CompanyParameters>,
    role: Role = Role.USER,
  ) {
    const parameters =
      role === Role.PLATFORM_ADMIN
        ? platformAdminParameters()
        : company
          ? resolveCompanyParameters(overrides)
          : noCompanyParameters();
    const companyFeatures = {
      forUser: jest.fn().mockResolvedValue(parameters),
      requireFeature: jest.fn(() => {
        if (!isFeatureEnabled(parameters, 'ranking'))
          throw new NotFoundException();
        return Promise.resolve(parameters);
      }),
    };
    const query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest
        .fn()
        .mockResolvedValue({ usuario: { empresa: company, role } }),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
      getRawOne: jest.fn().mockResolvedValue(undefined),
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue({ usuario_id: 7, total_points: 0 }),
      createQueryBuilder: jest.fn().mockReturnValue(query),
      count: jest.fn(),
    };
    const redisService = {
      get: jest.fn().mockResolvedValue(null),
      mget: jest.fn((keys: string[]) => Promise.resolve(keys.map(() => null))),
    };
    const dataSource = { getRepository: jest.fn().mockReturnValue({ find: jest.fn().mockResolvedValue([]) }), query: jest.fn().mockResolvedValue([]), transaction: jest.fn() };
    const service = new DashboardService(
      repository as never,
      dataSource as never,
      {
        countCompleted: () => Promise.resolve(0),
        countTotalActive: () => Promise.resolve(0),
      } as never,
      redisService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      companyFeatures as never,
    );
    return { service, query, repository, redisService, dataSource };
  }

  it('forces institutional scope even for a global request when disabled', async () => {
    const { service, query } = buildService({ id: 3, nome: 'Escola' });
    const ranking = await service.getRanking(7, 'global');

    expect(ranking.scope).toBe('company');
    expect(query.andWhere).toHaveBeenCalledWith('u.empresa_id = :empresaId', {
      empresaId: 3,
    });
  });

  it('permite a visualização para gerência sem incluí-la na classificação', async () => {
    const { service, query } = buildService(
      null,
      undefined,
      Role.PLATFORM_ADMIN,
    );
    await expect(service.getRanking(7, 'global')).resolves.toMatchObject({
      currentUser: null,
      viewerParticipates: false,
    });
    expect(query.andWhere).toHaveBeenCalledWith('u.role = :rankingRole', {
      rankingRole: Role.USER,
    });
  });

  it('trata o professor como gestão: vê o ranking da escola sem participar', async () => {
    const { service, query, repository } = buildService(
      { id: 3, nome: 'Escola' },
      undefined,
      'teacher' as Role,
    );
    await expect(service.getRanking(7, 'company')).resolves.toMatchObject({
      scope: 'company',
      currentUser: null,
      viewerParticipates: false,
    });
    expect(repository.findOne).not.toHaveBeenCalled();
    expect(query.andWhere).toHaveBeenCalledWith('u.role = :rankingRole', {
      rankingRole: Role.USER,
    });
  });

  it('limita a classificação aos participantes', async () => {
    const { service, query } = buildService({ id: 3, nome: 'Escola' });
    await service.getRanking(7, 'company');

    expect(query.andWhere).toHaveBeenCalledWith('u.role = :rankingRole', {
      rankingRole: Role.USER,
    });
  });

  it('does not expose other institutions to a user without an institution', async () => {
    const { service, query } = buildService(null);
    await expect(service.getRanking(7, 'global')).rejects.toThrow(
      NotFoundException,
    );
    expect(query.getMany).not.toHaveBeenCalled();
  });

  it('allows global scope only for an opted-in company and filters opted-out institutions', async () => {
    const { service, query } = buildService(
      { id: 3, nome: 'Escola' },
      { globalRankingEnabled: true },
    );
    expect((await service.getRanking(7, 'global')).scope).toBe('global');
    expect(query.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('$.globalRankingEnabled'),
    );
  });

  it('keeps the Top 3 and returns later players for the classification', async () => {
    const { service, query, redisService } = buildService({
      id: 3,
      nome: 'Escola',
    });
    query.getMany.mockResolvedValue(
      [500, 400, 300, 200, 100].map((points, index) => ({
        usuario_id: index + 1,
        total_points: points,
        usuario: { name: `Jogador ${index + 1}` },
      })),
    );
    redisService.mget.mockImplementation((keys: string[]) =>
      Promise.resolve(
        keys.map((key) =>
          key.includes(`ranking:week:${getRankingWeekStart()}:xp:`)
            ? String(
                [500, 400, 300, 200, 100][Number(key.split(':').at(-1)) - 1] ??
                  0,
              )
            : null,
        ),
      ),
    );

    const ranking = await service.getRanking(7, 'company');
    expect(ranking.top.map((entry) => entry.position)).toEqual([1, 2, 3]);
    expect(ranking.leaderboard.map((entry) => entry.position)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it('orders the season by recorded monthly XP instead of lifetime XP', async () => {
    const { service, query, redisService } = buildService({
      id: 3,
      nome: 'Escola',
    });
    query.getMany.mockResolvedValue([
      { usuario_id: 1, total_points: 5000, usuario: { name: 'Antigo' } },
      { usuario_id: 7, total_points: 100, usuario: { name: 'Atual' } },
    ]);
    redisService.mget.mockImplementation((keys: string[]) =>
      Promise.resolve(
        keys.map((key) =>
          key.includes(`ranking:week:${getRankingWeekStart()}:xp:7`)
            ? '100'
            : null,
        ),
      ),
    );

    const ranking = await service.getRanking(7, 'company');
    expect(ranking.top[0]).toMatchObject({
      rankKey: rankKey(7),
      position: 1,
      points: 100,
    });
    expect(ranking.currentUser.points).toBe(100);
    expect(ranking.top[1]).toMatchObject({ rankKey: rankKey(1), points: 0 });
  });

  it('orders total mode by lifetime XP', async () => {
    const { service, query } = buildService({ id: 3, nome: 'Escola' });
    query.getMany.mockResolvedValue([
      { usuario_id: 1, total_points: 5000, usuario: { nickname: 'Líder' } },
      { usuario_id: 7, total_points: 100, usuario: { nickname: 'Você' } },
    ]);
    const ranking = await service.getRanking(7, 'company', false, { mode: 'total' });
    expect(ranking).toMatchObject({ mode: 'total', metric: 'totalXp', selectedSeason: null, dataCompleteness: 'complete' });
    expect(ranking.top[0]).toMatchObject({
      rankKey: rankKey(1),
      position: 1,
      points: 5000,
    });
    expect(ranking.currentUser?.points).toBe(100);
  });

  it('does not invent a podium for a season without complete coverage', async () => {
    const { service, dataSource, query } = buildService({ id: 3, nome: 'Escola' });
    dataSource.query.mockResolvedValue([{ start_local_at: '2026-10-03 00:00:00.000000' }]);
    const ranking = await service.getRanking(7, 'company', false, { mode: 'season', selectedSeason: '2026-09' });
    expect(ranking).toMatchObject({ mode: 'season', metric: 'seasonXp', selectedSeason: '2026-09', dataCompleteness: 'unavailable', top: [], leaderboard: [], currentUser: null });
    expect(query.getMany).not.toHaveBeenCalled();
  });

  it('uses frozen global snapshots with tied positions and immutable names', async () => {
    const { service, dataSource, query } = buildService(
      { id: 3, nome: 'Escola atual' },
      { globalRankingEnabled: true },
    );
    const frozen = [
      { usuario_id: 1, points: 100, total_points: 200, display_name: 'Nome antigo 1', profile_image_key: null, empresa_id: 9, empresa_nome: 'Escola antiga' },
      { usuario_id: 2, points: 100, total_points: 300, display_name: 'Nome antigo 2', profile_image_key: null, empresa_id: 9, empresa_nome: 'Escola antiga' },
      { usuario_id: 7, points: 50, total_points: 120, display_name: 'Eu antes', profile_image_key: null, empresa_id: 9, empresa_nome: 'Escola antiga' },
    ];
    dataSource.query.mockImplementation(async (sql: string) =>
      sql.includes('ranking_season_snapshot') ? frozen : [{ start_local_at: '2026-09-01 00:00:00.000000' }],
    );
    const manager = { query: jest.fn(async (sql: string) => sql.includes('SELECT season_id') ? [{ season_id: '2026-09' }] : []) };
    dataSource.transaction.mockImplementation(async (callback) => callback(manager));

    const ranking = await service.getRanking(7, 'global', false, { mode: 'season', selectedSeason: '2026-09' });
    expect(ranking).toMatchObject({ mode: 'season', scope: 'global', dataCompleteness: 'complete', totalParticipants: 3 });
    const keys = ranking.top.map((entry) => [entry.rankKey, entry.position]);
    expect(keys).toEqual([[rankKey(1), 1], [rankKey(2), 1], [rankKey(7), 3]]);
    expect(ranking.currentUser).toMatchObject({ name: 'Eu antes', companyName: 'Escola antiga', position: 3 });
    expect(ranking.top[0]).toMatchObject({ name: 'Nome antigo 1', companyName: 'Escola antiga' });
    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('global_eligible = 1'), ['2026-09']);
    expect(query.getMany).not.toHaveBeenCalled();
  });

  it('filters historical company ranking by the authorized company', async () => {
    const { service, dataSource } = buildService({ id: 3, nome: 'Escola' });
    dataSource.query.mockImplementation(async (sql: string) =>
      sql.includes('ranking_season_snapshot') ? [] : [{ start_local_at: '2026-09-01 00:00:00.000000' }],
    );
    dataSource.transaction.mockImplementation(async (callback) => callback({ query: jest.fn().mockResolvedValue([{ season_id: '2026-09' }]) }));
    await service.getRanking(7, 'company', false, { mode: 'season', selectedSeason: '2026-09' });
    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('empresa_id = ?'), ['2026-09', 3]);
  });

  it('does not calculate global statistics when disabled', async () => {
    const { service, repository } = buildService(null);
    const stats = await service.getStats(7);

    expect(stats.globalRanking).toBeNull();
    expect(stats.totalUsers).toBeNull();
    expect(repository.count).not.toHaveBeenCalled();
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('refuses the entire ranking when disabled for a company', async () => {
    const { service, repository } = buildService(
      { id: 3, nome: 'Escola' },
      { rankingEnabled: false },
    );
    await expect(service.getRanking(7, 'company')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('ranking não recarrega todos os alunos a cada requisição (M1)', async () => {
    const { service, query } = buildService({ id: 3, nome: 'Escola' });
    await service.getRanking(7, 'company');
    await service.getRanking(7, 'company');
    expect(query.getMany).toHaveBeenCalledTimes(1);
    // XP mudou: o processo descarta o conjunto e recalcula na próxima leitura.
    await service.handleProgressChanged({ usuarioId: 7, skipCheckin: true });
    await service.getRanking(7, 'company');
    expect(query.getMany).toHaveBeenCalledTimes(2);
  });

  it('requisições simultâneas somam uma única carga do ranking', async () => {
    const { service, query } = buildService({ id: 3, nome: 'Escola' });
    await Promise.all(
      Array.from({ length: 5 }, () => service.getRanking(7, 'company')),
    );
    expect(query.getMany).toHaveBeenCalledTimes(1);
  });

  it('ranking global não expõe foto de outra escola nem usuario_id (M5/B8)', async () => {
    const school = { id: 3, nome: 'Escola' };
    const parameters = { globalRankingEnabled: true };
    const { service, query } = buildService(school, parameters);
    query.getMany.mockResolvedValue([
      {
        usuario_id: 1,
        total_points: 900,
        usuario: {
          nickname: 'Outra',
          empresa_id: 4,
          profile_image_key: 'fotos/1.png',
        },
      },
      {
        usuario_id: 2,
        total_points: 800,
        usuario: {
          nickname: 'Colega',
          empresa_id: 3,
          profile_image_key: 'fotos/2.png',
        },
      },
    ]);
    Object.assign(service as unknown as Record<string, unknown>, {
      s3Service: {
        generatePresignedGetUrl: (key: string) =>
          Promise.resolve(`https://bucket.test/${key}`),
      },
    });
    const ranking = await service.getRanking(7, 'global', false);
    const outra = ranking.leaderboard.find((entry) => entry.name === 'Outra');
    const colega = ranking.leaderboard.find((entry) => entry.name === 'Colega');
    expect(outra).not.toHaveProperty('id');
    expect(outra?.rankKey).toMatch(/^[0-9a-f]{16}$/);
    expect(outra?.profileImageUrl).toBeNull();
    expect(colega?.profileImageUrl).not.toBeNull();
  });
});
