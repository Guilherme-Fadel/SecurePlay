import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Role } from '../auth/roles.enum';
import { RolesGuard } from '../auth/roles.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import { TurmaAdminController } from './turma-admin.controller';
import {
  TurmaPlatformController,
  TurmaPlatformGlobalController,
} from './turma-platform.controller';
import { TurmaService } from './turma.service';
import { TurmaAcessoService } from './turma-acesso.service';

const identidades = new Map([
  [1, { userId: 1, role: Role.ADMIN, empresa_id: 10 }],
  [5, { userId: 5, role: 'teacher' as Role, empresa_id: 10 }],
  [9, { userId: 9, role: Role.PLATFORM_ADMIN, empresa_id: null }],
]);

describe('HTTP — gestão de turmas', () => {
  let app: NestFastifyApplication;
  const service = {
    listar: jest.fn().mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0,
    }),
    criar: jest.fn().mockResolvedValue({ id: 3 }),
    adicionarAlunos: jest
      .fn()
      .mockResolvedValue({ adicionados: 1, movidos: 0 }),
    assertEmpresa: jest.fn().mockResolvedValue(undefined),
  };
  const acesso = {
    carregarAtor: jest.fn((id: number) => {
      const identidade = identidades.get(id)!;
      return Promise.resolve({
        id,
        role: identidade.role,
        empresa_id: identidade.empresa_id,
      });
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [
        TurmaAdminController,
        TurmaPlatformController,
        TurmaPlatformGlobalController,
      ],
      providers: [
        { provide: TurmaService, useValue: service },
        { provide: TurmaAcessoService, useValue: acesso },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate(context: ExecutionContext) {
              const request = context.switchToHttp().getRequest<{
                user?: unknown;
                headers: Record<string, string>;
              }>();
              request.user = identidades.get(
                Number(request.headers['x-fixture-user']),
              );
              return !!request.user;
            },
          },
        },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: CsrfGuard },
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

  const chamar = (
    method: 'GET' | 'POST',
    url: string,
    usuario: number,
    payload?: unknown,
  ) =>
    app.inject({
      method,
      url,
      payload: payload as never,
      headers: {
        origin: 'http://localhost:5173',
        'x-fixture-user': String(usuario),
      },
    });

  it('professor não acessa a gestão de turmas da escola', async () => {
    expect((await chamar('GET', '/admin/empresa/turmas', 5)).statusCode).toBe(
      403,
    );
    expect(service.listar).not.toHaveBeenCalled();
  });

  it('admin da escola não acessa as rotas da plataforma', async () => {
    expect(
      (await chamar('GET', '/platform/admin/empresas/10/turmas', 1)).statusCode,
    ).toBe(403);
  });

  it('admin cria na própria escola mesmo que o corpo indique outra', async () => {
    const response = await chamar('POST', '/admin/empresa/turmas', 1, {
      nome: '5º A',
      ano_letivo: 2026,
      empresa_id: 20,
    });
    expect(response.statusCode).toBe(201);
    expect(service.criar).toHaveBeenCalledWith(1, 10, {
      nome: '5º A',
      ano_letivo: 2026,
    });
  });

  it('valida ano letivo e nome', async () => {
    expect(
      (
        await chamar('POST', '/admin/empresa/turmas', 1, {
          nome: '5º A',
          ano_letivo: 1999,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await chamar('POST', '/admin/empresa/turmas', 1, {
          nome: 'x'.repeat(81),
          ano_letivo: 2026,
        })
      ).statusCode,
    ).toBe(400);
    expect(service.criar).not.toHaveBeenCalled();
  });

  it('valida a lista de alunos', async () => {
    expect(
      (
        await chamar('POST', '/admin/empresa/turmas/3/alunos', 1, {
          usuario_ids: [],
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await chamar('POST', '/admin/empresa/turmas/3/alunos', 1, {
          usuario_ids: Array.from({ length: 101 }, (_, i) => i + 1),
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await chamar('POST', '/admin/empresa/turmas/3/alunos', 1, {
          usuario_ids: [4, 4],
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await chamar('POST', '/admin/empresa/turmas/3/alunos', 1, {
          usuario_ids: [4, 7],
        })
      ).statusCode,
    ).toBe(201);
    expect(service.adicionarAlunos).toHaveBeenCalledWith(1, 10, 3, [4, 7]);
  });

  it('plataforma confere a empresa da rota antes de criar', async () => {
    const response = await chamar(
      'POST',
      '/platform/admin/empresas/20/turmas',
      9,
      { nome: '7º C', ano_letivo: 2026 },
    );
    expect(response.statusCode).toBe(201);
    expect(service.assertEmpresa).toHaveBeenCalledWith(20);
    expect(service.criar).toHaveBeenCalledWith(9, 20, {
      nome: '7º C',
      ano_letivo: 2026,
    });
  });

  it('repassa filtros da listagem como números', async () => {
    await chamar(
      'GET',
      '/admin/empresa/turmas?page=2&pageSize=10&ano_letivo=2026&situacao=ativa&busca=5',
      1,
    );
    expect(service.listar).toHaveBeenCalledWith(10, {
      page: 2,
      pageSize: 10,
      ano_letivo: 2026,
      situacao: 'ativa',
      busca: '5',
    });
  });

  it('plataforma lista as turmas de todas as escolas sem exigir empresa', async () => {
    const response = await chamar(
      'GET',
      '/platform/admin/turmas?page=1&situacao=ativa',
      9,
    );
    expect(response.statusCode).toBe(200);
    expect(service.assertEmpresa).not.toHaveBeenCalled();
    expect(service.listar).toHaveBeenCalledWith(
      undefined,
      { page: 1, situacao: 'ativa' },
      true,
    );
  });

  it('plataforma filtra por escola e confere se ela existe', async () => {
    await chamar('GET', '/platform/admin/turmas?empresa_id=20', 9);
    expect(service.assertEmpresa).toHaveBeenCalledWith(20);
    expect(service.listar).toHaveBeenCalledWith(20, {}, true);
    expect(
      (await chamar('GET', '/platform/admin/turmas?empresa_id=abc', 9))
        .statusCode,
    ).toBe(400);
  });

  it('admin da escola e professor não listam as turmas de todas as escolas', async () => {
    expect((await chamar('GET', '/platform/admin/turmas', 1)).statusCode).toBe(
      403,
    );
    expect((await chamar('GET', '/platform/admin/turmas', 5)).statusCode).toBe(
      403,
    );
    expect(service.listar).not.toHaveBeenCalled();
  });
});
