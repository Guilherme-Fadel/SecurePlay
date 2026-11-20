import { DashboardService } from './dashboard.service';
import { defaultRankName, rankDisplayName, rankKey } from './rank-key';
import { resolveCompanyParameters } from '../config/features';

describe('nome padrão do ranking sem o id interno', () => {
  it('deriva o nome da rankKey, sem o usuario_id', () => {
    const nome = defaultRankName(987654);
    expect(nome).toBe(
      `Aventureiro ${rankKey(987654).slice(0, 4).toUpperCase()}`,
    );
    expect(nome).not.toContain('987654');
  });

  it('preserva apelido real e troca o nome padrão antigo gravado em snapshot', () => {
    expect(rankDisplayName('Capitã Luna', 12)).toBe('Capitã Luna');
    expect(rankDisplayName(null, 12)).toBe(defaultRankName(12));
    expect(rankDisplayName('Aventureiro 12', 12)).toBe(defaultRankName(12));
    expect(rankDisplayName('Aventureiro', 12)).toBe(defaultRankName(12));
    expect(rankDisplayName('Aventureiro Sombrio', 12)).toBe(
      'Aventureiro Sombrio',
    );
  });

  it('nenhum nome do ranking global contém o usuario_id', async () => {
    const parameters = resolveCompanyParameters({ globalRankingEnabled: true });
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
      getOne: jest.fn().mockResolvedValue({
        usuario: { empresa: { id: 3, nome: 'Escola' }, role: 'user' },
      }),
      getMany: jest.fn().mockResolvedValue([
        { usuario_id: 424242, total_points: 900, usuario: { empresa_id: 4 } },
        {
          usuario_id: 737373,
          total_points: 800,
          usuario: { nickname: 'Aventureiro 737373', empresa_id: 3 },
        },
        {
          usuario_id: 515151,
          total_points: 700,
          usuario: { nickname: 'Capitã Luna', empresa_id: 3 },
        },
      ]),
      getCount: jest.fn().mockResolvedValue(0),
      getRawOne: jest.fn().mockResolvedValue(undefined),
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue({ usuario_id: 7, total_points: 0 }),
      createQueryBuilder: jest.fn().mockReturnValue(query),
      count: jest.fn(),
    };
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      mget: jest.fn((keys: string[]) => Promise.resolve(keys.map(() => null))),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
      }),
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn(),
    };
    const service = new DashboardService(
      repository as never,
      dataSource as never,
      {
        countCompleted: () => Promise.resolve(0),
        countTotalActive: () => Promise.resolve(0),
      } as never,
      redis as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        forUser: jest.fn().mockResolvedValue(parameters),
        requireFeature: jest.fn().mockResolvedValue(parameters),
      } as never,
    );
    const ranking = await service.getRanking(7, 'global', false);
    const nomes = ranking.leaderboard.map((entry) => entry.name);
    expect(nomes).toContain('Capitã Luna');
    expect(nomes.length).toBeGreaterThanOrEqual(3);
    for (const nome of nomes) {
      for (const id of ['424242', '737373']) expect(nome).not.toContain(id);
    }
    const semApelido = ranking.leaderboard.find(
      (entry) => entry.rankKey === rankKey(424242),
    );
    expect(semApelido?.name).toBe(defaultRankName(424242));
  });
});
