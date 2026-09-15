import { NotFoundException } from '@nestjs/common';
import { CompanyFeaturesService } from './company-features.service';
import { Role } from '../../auth/roles.enum';
import {
  noCompanyParameters,
  platformAdminParameters,
  resolveCompanyParameters,
} from '../../config/features';

describe('CompanyFeaturesService — isolamento institucional', () => {
  it.each([null, { parametros_funcionalidades: noCompanyParameters() }])(
    'libera todos os recursos para platform_admin com empresa %p',
    async (empresa) => {
      const repository = {
        findOne: jest
          .fn()
          .mockResolvedValue({ role: Role.PLATFORM_ADMIN, empresa }),
      };
      const service = new CompanyFeaturesService({
        getRepository: () => repository,
      } as never);
      expect(await service.forUser(99)).toEqual(platformAdminParameters());
      await expect(
        service.requireFeature(99, 'achievements'),
      ).resolves.toBeDefined();
      await expect(
        service.requireFeature(99, 'globalRanking'),
      ).resolves.toBeDefined();
      await expect(
        service.requireGame(99, 'termotech'),
      ).resolves.toBeUndefined();
    },
  );

  it.each([Role.ADMIN, Role.USER])(
    'mantém restrições da empresa para %s',
    async (role) => {
      const repository = {
        findOne: jest
          .fn()
          .mockResolvedValue({
            role,
            empresa: { parametros_funcionalidades: noCompanyParameters() },
          }),
      };
      const service = new CompanyFeaturesService({
        getRepository: () => repository,
      } as never);
      await expect(service.requireFeature(1, 'achievements')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.requireGame(1, 'termotech')).rejects.toThrow(
        NotFoundException,
      );
    },
  );
  function setup() {
    const companies = new Map([
      [
        10,
        {
          parametros_funcionalidades: resolveCompanyParameters({
            achievementsEnabled: false,
            enabledGames: ['quiz-relampago'],
          }),
        },
      ],
      [
        20,
        {
          parametros_funcionalidades: resolveCompanyParameters({
            achievementsEnabled: true,
            rankingEnabled: false,
            enabledGames: ['termotech'],
          }),
        },
      ],
    ]);
    const repository = {
      findOne: jest.fn(async ({ where }: { where: { id: number } }) => ({
        empresa: companies.get(where.id) ?? null,
      })),
    };
    const service = new CompanyFeaturesService({
      getRepository: () => repository,
    } as never);
    return { service, companies, repository };
  }

  it('permite Conquistas somente para a empresa configurada', async () => {
    const { service } = setup();
    await expect(service.requireFeature(10, 'achievements')).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.requireFeature(20, 'achievements'),
    ).resolves.toBeDefined();
  });

  it('separa a seleção de jogos entre duas empresas', async () => {
    const { service } = setup();
    await expect(
      service.requireGame(10, 'quiz-relampago'),
    ).resolves.toBeUndefined();
    await expect(service.requireGame(10, 'termotech')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.requireGame(20, 'termotech')).resolves.toBeUndefined();
    await expect(service.requireGame(20, 'quiz-relampago')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('nega recursos para usuários sem empresa ou inexistentes', async () => {
    const { service, repository } = setup();
    expect(await service.forUser(30)).toEqual(noCompanyParameters());
    await expect(service.requireFeature(30, 'ranking')).rejects.toThrow(
      NotFoundException,
    );
    repository.findOne.mockResolvedValueOnce(null as never);
    expect(await service.forUser(99)).toEqual(noCompanyParameters());
  });

  it('lê alterações em cada acesso sem cache de permissões antigo', async () => {
    const { service, companies } = setup();
    await expect(
      service.requireFeature(20, 'achievements'),
    ).resolves.toBeDefined();
    companies.get(20)!.parametros_funcionalidades.achievementsEnabled = false;
    await expect(service.requireFeature(20, 'achievements')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('propaga falhas do banco sem liberar acesso por fallback', async () => {
    const { service, repository } = setup();
    repository.findOne.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.requireFeature(10, 'achievements')).rejects.toThrow(
      'database unavailable',
    );
  });
});
