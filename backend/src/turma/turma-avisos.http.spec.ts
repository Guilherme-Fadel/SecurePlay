import {
  ExecutionContext,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Role } from '../auth/roles.enum';
import { RolesGuard } from '../auth/roles.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import {
  TurmaAvisosAdminController,
  TurmaAvisosPlatformController,
} from './turma-avisos.controller';
import { TurmaAvisosService } from './turma-avisos.service';
import { TurmaService } from './turma.service';
import { TurmaAcessoService } from './turma-acesso.service';

const identidades = new Map([
  [1, { userId: 1, role: Role.ADMIN, empresa_id: 10 }],
  [2, { userId: 2, role: Role.ADMIN, empresa_id: 20 }],
  [5, { userId: 5, role: 'teacher' as Role, empresa_id: 10 }],
  [6, { userId: 6, role: Role.USER, empresa_id: 10 }],
  [9, { userId: 9, role: Role.PLATFORM_ADMIN, empresa_id: null }],
]);

describe('HTTP — aviso manual para a turma', () => {
  let app: NestFastifyApplication;
  const avisos = { enviar: jest.fn() };
  const turmas = { assertEmpresa: jest.fn().mockResolvedValue(undefined) };
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
    avisos.enviar.mockResolvedValue({ enviados: 4 });
    const module = await Test.createTestingModule({
      controllers: [TurmaAvisosAdminController, TurmaAvisosPlatformController],
      providers: [
        { provide: TurmaAvisosService, useValue: avisos },
        { provide: TurmaService, useValue: turmas },
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

  const enviar = (url: string, usuario: number, payload: unknown) =>
    app.inject({
      method: 'POST',
      url,
      payload: payload as never,
      headers: {
        origin: 'http://localhost:5173',
        'x-fixture-user': String(usuario),
      },
    });
  const rota = '/admin/empresa/turmas/3/avisos';

  it('admin da escola envia com a empresa derivada do banco e texto aparado', async () => {
    const response = await enviar(rota, 1, {
      title: '  Prova amanhã  ',
      message: ' Tragam o material. ',
      empresa_id: 20,
      link: 'https://exemplo.com',
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ enviados: 4 });
    expect(avisos.enviar).toHaveBeenCalledWith(1, 10, 3, {
      title: 'Prova amanhã',
      message: 'Tragam o material.',
    });
  });

  it('turma de outra escola responde 404 pelo serviço', async () => {
    avisos.enviar.mockRejectedValueOnce(
      new NotFoundException('Turma não encontrada'),
    );
    const response = await enviar(rota, 2, {
      title: 'Aviso',
      message: 'Mensagem',
    });
    expect(response.statusCode).toBe(404);
    expect(avisos.enviar).toHaveBeenCalledWith(2, 20, 3, expect.anything());
  });

  it('professor e aluno recebem 403', async () => {
    const corpo = { title: 'Aviso', message: 'Mensagem' };
    expect((await enviar(rota, 5, corpo)).statusCode).toBe(403);
    expect((await enviar(rota, 6, corpo)).statusCode).toBe(403);
    expect(avisos.enviar).not.toHaveBeenCalled();
  });

  it('valida os tamanhos de título e mensagem', async () => {
    const invalidos = [
      { title: 'ab', message: 'Mensagem' },
      { title: 'x'.repeat(101), message: 'Mensagem' },
      { title: 'Aviso', message: '  a ' },
      { title: 'Aviso', message: 'x'.repeat(251) },
      { title: 'Aviso' },
      { title: 123, message: 'Mensagem' },
    ];
    for (const corpo of invalidos)
      expect((await enviar(rota, 1, corpo)).statusCode).toBe(400);
    expect(avisos.enviar).not.toHaveBeenCalled();
  });

  it('plataforma confere a empresa da rota e admin da escola não usa essa rota', async () => {
    const url = '/platform/admin/empresas/20/turmas/3/avisos';
    const corpo = { title: 'Aviso', message: 'Mensagem' };
    expect((await enviar(url, 1, corpo)).statusCode).toBe(403);
    expect((await enviar(url, 9, corpo)).statusCode).toBe(201);
    expect(turmas.assertEmpresa).toHaveBeenCalledWith(20);
    expect(avisos.enviar).toHaveBeenCalledWith(9, 20, 3, corpo);
  });
});
