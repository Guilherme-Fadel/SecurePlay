import { DashboardService } from './dashboard.service';
import { NotFoundException } from '@nestjs/common';
import { Role } from '../auth/roles.enum';
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
      requireFeature: jest.fn(async () => {
        if (!isFeatureEnabled(parameters, 'ranking'))
          throw new NotFoundException();
        return parameters;
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
    const service = new DashboardService(
      repository as never,
      {
        countCompleted: async () => 0,
        countTotalActive: async () => 0,
      } as never,
      { get: async () => null } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      companyFeatures as never,
    );
    return { service, query, repository };
  }

  it('forces institutional scope even for a global request when disabled', async () => {
    const { service, query } = buildService({ id: 3, nome: 'Escola' });
    const ranking = await service.getRanking(7, 'global');

    expect(ranking.scope).toBe('company');
    expect(query.andWhere).toHaveBeenCalledWith('u.empresa_id = :empresaId', {
      empresaId: 3,
    });
  });

  it('permite ranking global administrativo sem empresa ou filtro de adesão', async () => {
    const { service, query } = buildService(
      null,
      undefined,
      Role.PLATFORM_ADMIN,
    );
    expect((await service.getRanking(7, 'global')).scope).toBe('global');
    expect(query.andWhere).not.toHaveBeenCalled();
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
});
