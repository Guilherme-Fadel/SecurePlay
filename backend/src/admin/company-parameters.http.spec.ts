import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AdminController } from './admin.controller';
import { PlatformAdminController } from './platform-admin.controller';
import { AdminService } from './admin.service';
import { ConvitesService } from './convites.service';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/roles.enum';
import { FeatureGuard } from '../common/features/feature.guard';
import { CompanyFeaturesService } from '../common/features/company-features.service';
import { AchievementsController } from '../achievements/achievements.controller';
import { AchievementsService } from '../achievements/achievements.service';
import { S3Service } from '../conteudo/s3/s3.service';
import { Empresa } from '../empresa/empresa.entity';
import { resolveCompanyParameters } from '../config/features';

// Teste HTTP em memória. A identidade é uma fixture, não substitui testes de JWT/CSRF.
describe('HTTP — parâmetros institucionais', () => {
  it('salva nome, layout e parâmetros em uma única requisição da plataforma', async () => {
    const parametros = resolveCompanyParameters({ achievementsEnabled: true });
    const paleta = {
      primary: '#111111',
      secondary: '#222222',
      accent: '#333333',
      text_primary: '#444444',
      text_secondary: '#555555',
    };
    const result = await app.inject({
      method: 'PUT',
      url: '/platform/admin/empresas/10/configuracoes',
      headers: { 'x-fixture-user': '9' },
      payload: { nome: 'Escola piloto', paleta, parametros },
    });
    expect(result.statusCode).toBe(200);
    expect(result.json()).toMatchObject({
      tema: { nome: 'Escola piloto', paleta },
      parametros,
    });
    expect(companies.get(20)!.parametros_funcionalidades.enabledGames).toEqual([
      'termotech',
    ]);
  });

  it.each(['1', '3'])(
    'impede salvamento integrado pelo perfil institucional %s',
    async (identity) => {
      const result = await app.inject({
        method: 'PUT',
        url: '/platform/admin/empresas/10/configuracoes',
        headers: { 'x-fixture-user': identity },
        payload: { nome: 'Não permitido' },
      });
      expect(result.statusCode).toBe(403);
    },
  );

  it('rejeita parâmetros inválidos sem salvar o nome junto', async () => {
    const previous = companies.get(10)!.nome;
    const result = await app.inject({
      method: 'PUT',
      url: '/platform/admin/empresas/10/configuracoes',
      headers: { 'x-fixture-user': '9' },
      payload: {
        nome: 'Nome alterado',
        parametros: {
          ...resolveCompanyParameters(),
          achievementsEnabled: 'true',
        },
      },
    });
    expect(result.statusCode).toBe(400);
    expect(companies.get(10)!.nome).toBe(previous);
  });
  let app: NestFastifyApplication;
  let companies: Map<
    number,
    {
      id: number;
      parametros_funcionalidades: ReturnType<typeof resolveCompanyParameters>;
    }
  >;
  const identities = new Map([
    [1, { userId: 1, role: Role.ADMIN, empresa_id: 10 }],
    [2, { userId: 2, role: Role.ADMIN, empresa_id: 20 }],
    [3, { userId: 3, role: Role.USER, empresa_id: 10 }],
    [9, { userId: 9, role: Role.PLATFORM_ADMIN, empresa_id: null }],
  ]);

  beforeEach(async () => {
    companies = new Map([
      [
        10,
        {
          id: 10,
          parametros_funcionalidades: resolveCompanyParameters({
            enabledGames: ['quiz-relampago'],
          }),
        },
      ],
      [
        20,
        {
          id: 20,
          parametros_funcionalidades: resolveCompanyParameters({
            achievementsEnabled: true,
            rankingEnabled: false,
            enabledGames: ['termotech'],
          }),
        },
      ],
    ]);
    const userRepository = {
      findOne: async ({ where }: { where: { id: number } }) => {
        const identity = identities.get(where.id);
        return identity
          ? {
              ...identity,
              empresa: companies.get(identity.empresa_id ?? -1) ?? null,
            }
          : null;
      },
    };
    const companyRepository = {
      findOne: async ({ where }: { where: { id: number } }) =>
        companies.get(where.id) ?? null,
    };
    const dataSource = {
      getRepository: () => userRepository,
      transaction: async (callback) => {
        const staged = new Map(
          [...companies].map(([id, company]) => [id, { ...company }]),
        );
        const result = await callback({
          findOne: async (_entity, { where }) => staged.get(where.id) ?? null,
          save: async (entity, record) => {
            if (entity === Empresa) staged.set(record.id, record);
            return record;
          },
        });
        companies = staged;
        return result;
      },
    };
    const module = await Test.createTestingModule({
      controllers: [
        AdminController,
        PlatformAdminController,
        AchievementsController,
      ],
      providers: [
        AdminService,
        CompanyFeaturesService,
        { provide: 'EMPRESA_REPOSITORY', useValue: companyRepository },
        { provide: 'USUARIO_REPOSITORY', useValue: userRepository },
        { provide: 'DATA_SOURCE', useValue: dataSource },
        { provide: S3Service, useValue: {} },
        { provide: ConvitesService, useValue: {} },
        {
          provide: AchievementsService,
          useValue: { getTrail: async () => ({ available: true }) },
        },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate(context: ExecutionContext) {
              const request = context.switchToHttp().getRequest();
              request.user = identities.get(
                Number(request.headers['x-fixture-user']),
              );
              return !!request.user;
            },
          },
        },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: FeatureGuard },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna configurações diferentes para cada administrador', async () => {
    const first = await app.inject({
      method: 'GET',
      url: '/admin/empresa/parametros',
      headers: { 'x-fixture-user': '1' },
    });
    const second = await app.inject({
      method: 'GET',
      url: '/admin/empresa/parametros',
      headers: { 'x-fixture-user': '2' },
    });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json().achievementsEnabled).toBe(false);
    expect(second.json().achievementsEnabled).toBe(true);
  });

  it('bloqueia acesso direto ao recurso desabilitado mesmo com empresa de outra instituição na URL', async () => {
    const denied = await app.inject({
      method: 'GET',
      url: '/achievements?empresa_id=20',
      headers: { 'x-fixture-user': '1' },
    });
    const allowed = await app.inject({
      method: 'GET',
      url: '/achievements',
      headers: { 'x-fixture-user': '2' },
    });
    expect(denied.statusCode).toBe(404);
    expect(allowed.statusCode).toBe(200);
  });

  it('aplica a alteração pela plataforma somente à empresa selecionada e reflete a permissão sem reinício', async () => {
    const updated = resolveCompanyParameters({
      achievementsEnabled: true,
      rankingEnabled: false,
    });
    const result = await app.inject({
      method: 'PUT',
      url: '/platform/admin/empresas/10/parametros',
      headers: { 'x-fixture-user': '9' },
      payload: { ...updated, empresa_id: 20 },
    });
    expect(result.statusCode).toBe(200);
    expect(companies.get(10)!.parametros_funcionalidades).toEqual(updated);
    expect(companies.get(20)!.parametros_funcionalidades.enabledGames).toEqual([
      'termotech',
    ]);
    const resource = await app.inject({
      method: 'GET',
      url: '/achievements',
      headers: { 'x-fixture-user': '1' },
    });
    expect(resource.statusCode).toBe(200);
  });

  it('nega alteração de parâmetros ao aluno e acesso global ao administrador institucional', async () => {
    const student = await app.inject({
      method: 'PUT',
      url: '/admin/empresa/parametros',
      headers: { 'x-fixture-user': '3' },
      payload: resolveCompanyParameters(),
    });
    const admin = await app.inject({
      method: 'PUT',
      url: '/platform/admin/empresas/20/parametros',
      headers: { 'x-fixture-user': '1' },
      payload: resolveCompanyParameters(),
    });
    expect(student.statusCode).toBe(404);
    expect(admin.statusCode).toBe(403);
  });

  it('permite ao administrador da plataforma editar uma empresa selecionada', async () => {
    const result = await app.inject({
      method: 'PUT',
      url: '/platform/admin/empresas/20/parametros',
      headers: { 'x-fixture-user': '9' },
      payload: resolveCompanyParameters({ enabledGames: [] }),
    });
    expect(result.statusCode).toBe(200);
    expect(companies.get(20)!.parametros_funcionalidades.enabledGames).toEqual(
      [],
    );
    expect(companies.get(10)!.parametros_funcionalidades.enabledGames).toEqual([
      'quiz-relampago',
    ]);
  });

  it('rejeita payload inválido sem alterar a configuração', async () => {
    const result = await app.inject({
      method: 'PUT',
      url: '/platform/admin/empresas/10/parametros',
      headers: { 'x-fixture-user': '9' },
      payload: {
        ...resolveCompanyParameters(),
        rankingEnabled: 'false',
        enabledGames: ['invalid'],
      },
    });
    expect(result.statusCode).toBe(400);
    expect(companies.get(10)!.parametros_funcionalidades.enabledGames).toEqual([
      'quiz-relampago',
    ]);
  });

  it('libera Conquistas ao master sem empresa sem liberar a instituição', async () => {
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/achievements',
          headers: { 'x-fixture-user': '9' },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/achievements',
          headers: { 'x-fixture-user': '1' },
        })
      ).statusCode,
    ).toBe(404);
  });

  it('permite consulta institucional mas impede alteração pela rota antiga e consulta por aluno', async () => {
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/admin/empresa/parametros',
          headers: { 'x-fixture-user': '1' },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/admin/empresa/parametros',
          headers: { 'x-fixture-user': '3' },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/admin/empresa/parametros',
          headers: { 'x-fixture-user': '1' },
          payload: resolveCompanyParameters(),
        })
      ).statusCode,
    ).toBe(404);
  });
});
