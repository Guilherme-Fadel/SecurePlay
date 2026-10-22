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
import { AdminAuditService } from './admin-audit.service';
import { ConvitesService } from './convites.service';
import { RolesGuard } from '../auth/roles.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import { Role } from '../auth/roles.enum';
import { FeatureGuard } from '../common/features/feature.guard';
import { CompanyFeaturesService } from '../common/features/company-features.service';
import { AchievementsController } from '../achievements/achievements.controller';
import { AchievementsService } from '../achievements/achievements.service';
import { S3Service } from '../conteudo/s3/s3.service';
import { Empresa } from '../empresa/empresa.entity';
import { resolveCompanyParameters } from '../config/features';
import { getLocalDateKey } from '../common/utils/date.utils';

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
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '9' },
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
        headers: { origin: 'http://localhost:5173', 'x-fixture-user': identity },
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
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '9' },
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

  it('permite reativação pelo admin da própria empresa e barra aluno', async () => {
    const allowed = await app.inject({
      method: 'POST',
      url: '/admin/empresa/usuarios/22/reativar',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
      payload: { motivo: 'Retorno autorizado pela escola' },
    });
    expect(allowed.statusCode).toBe(201);
    expect(convitesServiceMock.reativarUsuario).toHaveBeenCalledWith(
      1,
      22,
      'Retorno autorizado pela escola',
    );

    const denied = await app.inject({
      method: 'POST',
      url: '/admin/empresa/usuarios/22/reativar',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '3' },
      payload: { motivo: 'Retorno autorizado pela escola' },
    });
    expect(denied.statusCode).toBe(403);
    expect(convitesServiceMock.reativarUsuario).toHaveBeenCalledTimes(1);

    const missingReason = await app.inject({
      method: 'POST',
      url: '/admin/empresa/usuarios/24/reativar',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
    });
    expect(missingReason.statusCode).toBe(400);
    expect(convitesServiceMock.reativarUsuario).toHaveBeenCalledTimes(1);

    for (const motivo of ['abc', '     ', 'x'.repeat(301)]) {
      const invalidReason = await app.inject({
        method: 'POST',
        url: '/admin/empresa/usuarios/24/reativar',
        headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
        payload: { motivo },
      });
      expect(invalidReason.statusCode).toBe(400);
    }
    expect(convitesServiceMock.reativarUsuario).toHaveBeenCalledTimes(1);

    const csrfDenied = await app.inject({
      method: 'POST',
      url: '/admin/empresa/usuarios/23/reativar',
      headers: {
        origin: 'https://origem-invalida.example',
        'x-fixture-user': '1',
      },
      payload: { motivo: 'Retorno autorizado pela escola' },
    });
    expect(csrfDenied.statusCode).toBe(403);
    expect(convitesServiceMock.reativarUsuario).toHaveBeenCalledTimes(1);
  });

  it('reserva reativação global ao platform_admin', async () => {
    const denied = await app.inject({
      method: 'POST',
      url: '/platform/admin/usuarios/22/reativar',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
      payload: { motivo: 'Retorno autorizado pela escola' },
    });
    expect(denied.statusCode).toBe(403);

    const allowed = await app.inject({
      method: 'POST',
      url: '/platform/admin/empresas/20/usuarios/22/reativar',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '9' },
      payload: { motivo: 'Retorno autorizado pela escola' },
    });
    expect(allowed.statusCode).toBe(201);
    expect(convitesServiceMock.reativarUsuarioDaEmpresa).toHaveBeenCalledWith(
      20,
      9,
      22,
      'Retorno autorizado pela escola',
    );
    expect(convitesServiceMock.reativarUsuarioGlobal).not.toHaveBeenCalled();
  });

  it('aplica motivo e proteção CSRF nas rotas de inativação escolar e da plataforma', async () => {
    const schoolAllowed = await app.inject({
      method: 'POST',
      url: '/admin/empresa/usuarios/22/inativar',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
      payload: { motivo: 'Fim do vínculo escolar' },
    });
    expect(schoolAllowed.statusCode).toBe(201);
    expect(convitesServiceMock.inativarUsuario).toHaveBeenCalledWith(
      1,
      22,
      'Fim do vínculo escolar',
    );

    const platformAllowed = await app.inject({
      method: 'POST',
      url: '/platform/admin/empresas/20/usuarios/22/inativar',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '9' },
      payload: { motivo: 'Solicitação da escola' },
    });
    expect(platformAllowed.statusCode).toBe(201);
    expect(convitesServiceMock.inativarUsuarioDaEmpresa).toHaveBeenCalledWith(
      20,
      9,
      22,
      'Solicitação da escola',
    );

    const csrfDenied = await app.inject({
      method: 'POST',
      url: '/platform/admin/empresas/20/usuarios/22/inativar',
      headers: {
        origin: 'https://origem-invalida.example',
        'x-fixture-user': '9',
      },
      payload: { motivo: 'Solicitação da escola' },
    });
    expect(csrfDenied.statusCode).toBe(403);
    expect(convitesServiceMock.inativarUsuarioDaEmpresa).toHaveBeenCalledTimes(1);
  });

  it('protege a lista escolar e encaminha a empresa selecionada na lista global', async () => {
    const schoolList = await app.inject({
      method: 'GET',
      url: '/admin/empresa/usuarios?page=2&pageSize=5&search=Jo&status=active&sort=desc&empresa_id=20',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
    });
    expect(schoolList.statusCode).toBe(200);
    expect(convitesServiceMock.listarUsuariosPaginados).toHaveBeenCalledWith(
      1,
      { page: 2, pageSize: 5, search: 'Jo', status: 'active', sort: 'desc' },
    );

    const studentDenied = await app.inject({
      method: 'GET',
      url: '/admin/empresa/usuarios?empresa_id=20',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '3' },
    });
    expect(studentDenied.statusCode).toBe(403);
    expect(convitesServiceMock.listarUsuariosPaginados).toHaveBeenCalledTimes(1);

    const platformDenied = await app.inject({
      method: 'GET',
      url: '/platform/admin/empresas/20/usuarios',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
    });
    expect(platformDenied.statusCode).toBe(403);

    const platformList = await app.inject({
      method: 'GET',
      url: '/platform/admin/empresas/20/usuarios?page=1&pageSize=10&search=Ana&status=inactive&sort=asc',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '9' },
    });
    expect(platformList.statusCode).toBe(200);
    expect(
      convitesServiceMock.listarUsuariosPaginadosDaEmpresa,
    ).toHaveBeenCalledWith(20, {
      page: 1,
      pageSize: 10,
      search: 'Ana',
      status: 'inactive',
      sort: 'asc',
    });
  });

  it('reserva a listagem global de usuários ao platform_admin', async () => {
    const schoolAdmin = await app.inject({
      method: 'GET',
      url: '/platform/admin/usuarios',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
    });
    expect(schoolAdmin.statusCode).toBe(403);

    const student = await app.inject({
      method: 'GET',
      url: '/platform/admin/usuarios',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '3' },
    });
    expect(student.statusCode).toBe(403);

    const platformAdmin = await app.inject({
      method: 'GET',
      url: '/platform/admin/usuarios',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '9' },
    });
    expect(platformAdmin.statusCode).toBe(200);
    expect(platformAdmin.json()).toEqual([
      {
        id: 3,
        name: 'Aluno Fixture',
        email: 'aluno@example.invalid',
        role: Role.USER,
        level: 2,
        active: true,
        empresa_id: 10,
        empresa_nome: 'Escola Fixture',
      },
    ]);
  });

  it('reserva a leitura de eventos de auditoria ao platform_admin e passa a empresa selecionada', async () => {
    const schoolAdmin = await app.inject({
      method: 'GET',
      url: '/platform/admin/empresas/20/auditoria/eventos?page=2&pageSize=5',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
    });
    expect(schoolAdmin.statusCode).toBe(403);

    const student = await app.inject({
      method: 'GET',
      url: '/platform/admin/empresas/20/auditoria/eventos',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '3' },
    });
    expect(student.statusCode).toBe(403);

    const platformAdmin = await app.inject({
      method: 'GET',
      url: '/platform/admin/empresas/20/auditoria/eventos?page=2&pageSize=5',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '9' },
    });
    expect(platformAdmin.statusCode).toBe(200);
    expect(platformAdmin.json()).toEqual({ items: [], total: 0 });
    expect(adminAuditListMock).toHaveBeenCalledWith(20, 2, 5);
  });

  let app: NestFastifyApplication;
  let adminAuditListMock: jest.Mock;
  let convitesServiceMock: {
    inativarUsuario: jest.Mock;
    inativarUsuarioDaEmpresa: jest.Mock;
    reativarUsuario: jest.Mock;
    reativarUsuarioDaEmpresa: jest.Mock;
    reativarUsuarioGlobal: jest.Mock;
    listarUsuariosPaginados: jest.Mock;
    listarUsuariosPaginadosDaEmpresa: jest.Mock;
  };
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
    adminAuditListMock = jest.fn().mockResolvedValue({ items: [], total: 0 });
    convitesServiceMock = {
      inativarUsuario: jest.fn().mockResolvedValue({ id: 22, active: false }),
      inativarUsuarioDaEmpresa: jest
        .fn()
        .mockResolvedValue({ id: 22, active: false }),
      reativarUsuario: jest.fn().mockResolvedValue({ id: 22, active: true }),
      reativarUsuarioDaEmpresa: jest.fn().mockResolvedValue({ id: 22, active: true }),
      reativarUsuarioGlobal: jest.fn().mockResolvedValue({ id: 22, active: true }),
      listarUsuariosPaginados: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      listarUsuariosPaginadosDaEmpresa: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
    };
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
      find: async () => [
        {
          id: 3,
          name: 'Aluno Fixture',
          email: 'aluno@example.invalid',
          role: Role.USER,
          level: 2,
          active: true,
          empresa_id: 10,
          empresa: { nome: 'Escola Fixture' },
        },
      ],
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
      // Massa sem temporadas completas anteriores: o teste exercita parâmetros,
      // enquanto fechamento e snapshots têm cobertura própria em ranking-history.
      query: (sql: string) => {
        if (sql === 'SELECT id FROM ranking_tracking WHERE id = 1') {
          return Promise.resolve([{ id: 1 }]);
        }
        if (sql.startsWith('UPDATE ranking_tracking SET start_local_at')) {
          return Promise.resolve([]);
        }
        if (sql.startsWith('SELECT DATE_FORMAT(start_local_at,')) {
          return Promise.resolve([
            { start_local_at: `${getLocalDateKey()} 00:00:00.000000` },
          ]);
        }
        throw new Error('Consulta inesperada na fixture de parâmetros');
      },
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
        { provide: ConvitesService, useValue: convitesServiceMock },
        {
          provide: AdminAuditService,
          useValue: { listarDaEmpresa: adminAuditListMock },
        },
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
        { provide: APP_GUARD, useClass: CsrfGuard },
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
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
    });
    const second = await app.inject({
      method: 'GET',
      url: '/admin/empresa/parametros',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '2' },
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
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
    });
    const allowed = await app.inject({
      method: 'GET',
      url: '/achievements',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '2' },
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
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '9' },
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
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
    });
    expect(resource.statusCode).toBe(200);
  });

  it('nega alteração de parâmetros ao aluno e acesso global ao administrador institucional', async () => {
    const student = await app.inject({
      method: 'PUT',
      url: '/admin/empresa/parametros',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '3' },
      payload: resolveCompanyParameters(),
    });
    const admin = await app.inject({
      method: 'PUT',
      url: '/platform/admin/empresas/20/parametros',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
      payload: resolveCompanyParameters(),
    });
    expect(student.statusCode).toBe(404);
    expect(admin.statusCode).toBe(403);
  });

  it('permite ao administrador da plataforma editar uma empresa selecionada', async () => {
    const result = await app.inject({
      method: 'PUT',
      url: '/platform/admin/empresas/20/parametros',
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '9' },
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
      headers: { origin: 'http://localhost:5173', 'x-fixture-user': '9' },
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
          headers: { origin: 'http://localhost:5173', 'x-fixture-user': '9' },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/achievements',
          headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
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
          headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/admin/empresa/parametros',
          headers: { origin: 'http://localhost:5173', 'x-fixture-user': '3' },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/admin/empresa/parametros',
          headers: { origin: 'http://localhost:5173', 'x-fixture-user': '1' },
          payload: resolveCompanyParameters(),
        })
      ).statusCode,
    ).toBe(404);
  });
});
