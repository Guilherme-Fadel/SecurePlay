import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/roles.enum';
import { Usuario } from '../usuario/usuario.entity';
import { Empresa } from '../empresa/empresa.entity';
import { CompanyRegistration } from './entities/company-registration.entity';
import { CompanyRegistrationService } from './company-registration.service';
import {
  OwnCompanyRegistrationController,
  PlatformCompanyRegistrationController,
} from './company-registration.controller';
import { PlatformAdminController } from './platform-admin.controller';
import { AdminService } from './admin.service';
import { ConvitesService } from './convites.service';
import { AdminAuditService } from './admin-audit.service';
import { SchoolPilotService } from './school-pilot.service';
import {
  emptyRegistration,
  normalizeRegistration,
} from './company-registration';
import { CompanyRegistrationDto } from './dto/company-registration.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

describe('HTTP — cadastro privado, roles e identidade da sessão', () => {
  let app: NestFastifyApplication;
  const identities = new Map([
    [1, { id: 1, userId: 1, role: Role.ADMIN, active: true, empresa_id: 10 }],
    [2, { id: 2, userId: 2, role: Role.ADMIN, active: true, empresa_id: 20 }],
    [3, { id: 3, userId: 3, role: Role.USER, active: true, empresa_id: 10 }],
    [
      9,
      {
        id: 9,
        userId: 9,
        role: Role.PLATFORM_ADMIN,
        active: true,
        empresa_id: null,
      },
    ],
  ]);
  const create = jest.fn(
    (
      _nome: string,
      _email: string,
      _actor: number,
      cadastro: CompanyRegistrationDto,
    ) => Promise.resolve({ cadastro: normalizeRegistration(cadastro, true) }),
  );
  const update = jest
    .fn<
      Promise<{ sucesso: boolean }>,
      [number, number, UpdateCompanySettingsDto]
    >()
    .mockResolvedValue({ sucesso: true });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        OwnCompanyRegistrationController,
        PlatformCompanyRegistrationController,
        PlatformAdminController,
      ],
      providers: [
        CompanyRegistrationService,
        {
          provide: 'DATA_SOURCE',
          useValue: {
            getRepository: (entity: unknown) => {
              if (entity === Usuario)
                return {
                  findOne: ({ where }: { where: { id: number } }) =>
                    Promise.resolve(identities.get(where.id)),
                };
              if (entity === Empresa)
                return {
                  findOne: ({ where }: { where: { id: number } }) =>
                    Promise.resolve({
                      id: where.id,
                      nome: `Escola ${where.id}`,
                    }),
                };
              if (entity === CompanyRegistration)
                return {
                  findOne: ({ where }: { where: { empresa_id: number } }) =>
                    Promise.resolve({
                      empresa_id: where.empresa_id,
                      ...emptyRegistration(),
                      contato_nome: `Contato ${where.empresa_id}`,
                    }),
                  find: () => Promise.resolve([]),
                };
              throw new Error('Entidade fora da fixture');
            },
          },
        },
        {
          provide: AdminService,
          useValue: {
            criarEmpresa: create,
            updateConfiguracoesDaEmpresa: update,
          },
        },
        { provide: ConvitesService, useValue: {} },
        { provide: AdminAuditService, useValue: {} },
        { provide: SchoolPilotService, useValue: {} },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate(context: ExecutionContext) {
              const req = context.switchToHttp().getRequest<{
                user?: unknown;
                headers: Record<string, string>;
              }>();
              req.user = identities.get(Number(req.headers['x-fixture-user']));
              return Boolean(req.user);
            },
          },
        },
        { provide: APP_GUARD, useClass: RolesGuard },
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
  beforeEach(() => {
    jest.clearAllMocks();
    create.mockImplementation((_nome, _email, _id, cadastro) => ({
      cadastro: normalizeRegistration(cadastro, true),
    }));
  });
  afterAll(async () => {
    await app.close();
  });

  it.each([1, 2])(
    'admin %s consulta apenas o próprio cadastro apesar de query forjada',
    async (user) => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/empresa/cadastro?empresaId=999',
        headers: { 'x-fixture-user': String(user) },
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.json<{ empresa_id: number }>().empresa_id).toBe(
        identities.get(user)?.empresa_id,
      );
      expect(
        response.json<{ cadastro: { contato_nome: string } }>().cadastro
          .contato_nome,
      ).toBe(`Contato ${identities.get(user)?.empresa_id}`);
    },
  );
  it.each([1, 2, 3])(
    'perfil %s não consulta empresa global nem enumera CNPJ',
    async (user) => {
      for (const url of [
        '/platform/admin/empresas/20/cadastro',
        '/platform/admin/empresas/cadastro/cnpj',
      ]) {
        const response = await app.inject({
          method: url.endsWith('/cnpj') ? 'POST' : 'GET',
          url,
          ...(url.endsWith('/cnpj')
            ? { payload: { cnpj: '11222333000181' } }
            : {}),
          headers: { 'x-fixture-user': String(user) },
        });
        expect(response.statusCode).toBe(403);
      }
    },
  );
  it('aluno não consulta cadastro próprio e admin não ganha rota de edição', async () => {
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/admin/empresa/cadastro',
          headers: { 'x-fixture-user': '3' },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/admin/empresa/cadastro',
          headers: { 'x-fixture-user': '1' },
          payload: { cnpj: '11222333000181' },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/platform/admin/empresas/20/configuracoes',
          headers: { 'x-fixture-user': '1' },
          payload: { cadastro: { unidade: 'Forjada' } },
        })
      ).statusCode,
    ).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
  it('plataforma pode consultar empresa selecionada e CNPJ inválido retorna 400', async () => {
    const lookup = await app.inject({
      method: 'POST',
      url: '/platform/admin/empresas/cadastro/cnpj',
      payload: { cnpj: '11222333000181' },
      headers: { 'x-fixture-user': '9' },
    });
    expect(lookup.statusCode).toBe(201);
    expect(lookup.headers['cache-control']).toBe('private, no-store');
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/platform/admin/empresas/20/cadastro',
          headers: { 'x-fixture-user': '9' },
        })
      ).json<{ empresa_id: number }>().empresa_id,
    ).toBe(20);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/platform/admin/empresas/cadastro/cnpj',
          payload: { cnpj: 'abc' },
          headers: { 'x-fixture-user': '9' },
        })
      ).statusCode,
    ).toBe(400);
  });
  it('criação exige cadastro e rejeita campo com tipo inválido antes do serviço', async () => {
    const url = '/platform/admin/empresas';
    const headers = { 'x-fixture-user': '9' };
    expect(
      (
        await app.inject({
          method: 'POST',
          url,
          headers,
          payload: {
            nome: 'Escola',
            email_administrador: 'admin@example.test',
          },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url,
          headers,
          payload: {
            nome: 'Escola',
            email_administrador: 'admin@example.test',
            cadastro: { cnpj: 123 },
          },
        })
      ).statusCode,
    ).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
  it('whitelist aninhada descarta empresa_id e role recebidos no cadastro', async () => {
    update.mockResolvedValue({ sucesso: true });
    const response = await app.inject({
      method: 'PUT',
      url: '/platform/admin/empresas/10/configuracoes',
      headers: { 'x-fixture-user': '9' },
      payload: {
        cadastro: { contato_nome: 'Atualizado', empresa_id: 20, role: 'admin' },
      },
    });
    expect(response.statusCode).toBe(200);
    const [empresaId, actorId, dto] = update.mock.calls[0];
    expect(empresaId).toBe(10);
    expect(actorId).toBe(9);
    expect(dto.cadastro).not.toHaveProperty('empresa_id');
    expect(dto.cadastro).not.toHaveProperty('role');
  });
});
