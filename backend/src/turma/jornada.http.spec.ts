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
import { JornadaController } from './jornada.controller';
import { JornadaEdicaoService } from './jornada-edicao.service';

const identidades = new Map([
  [1, { userId: 1, role: Role.ADMIN }],
  [3, { userId: 3, role: Role.USER }],
  [5, { userId: 5, role: 'teacher' as Role }],
]);

describe('HTTP — jornada da turma', () => {
  let app: NestFastifyApplication;
  const service = {
    minhas: jest.fn().mockResolvedValue([]),
    obter: jest.fn().mockResolvedValue({ turma: { id: 7 } }),
    salvarModulos: jest.fn().mockResolvedValue({}),
    definirAbertura: jest.fn().mockResolvedValue({}),
    cancelarAbertura: jest.fn().mockResolvedValue({}),
    alunosDaTurma: jest.fn().mockResolvedValue({ items: [] }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [JornadaController],
      providers: [
        { provide: JornadaEdicaoService, useValue: service },
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
    method: 'GET' | 'PUT' | 'DELETE',
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

  it('aluno não acessa a jornada de edição', async () => {
    expect((await chamar('GET', '/turmas/7/jornada', 3)).statusCode).toBe(403);
    expect((await chamar('GET', '/turmas/minhas', 3)).statusCode).toBe(403);
    expect(service.obter).not.toHaveBeenCalled();
  });

  it('professor obtém a jornada da turma pela própria identidade', async () => {
    const response = await chamar('GET', '/turmas/7/jornada', 5);
    expect(response.statusCode).toBe(200);
    expect(service.obter).toHaveBeenCalledWith(5, 7);
  });

  it('abre agora e agenda com data ISO com fuso', async () => {
    expect(
      (
        await chamar('PUT', '/turmas/7/jornada/aulas/11/abertura', 5, {
          modo: 'agora',
        })
      ).statusCode,
    ).toBe(200);
    expect(service.definirAbertura).toHaveBeenLastCalledWith(5, 7, 11, {
      modo: 'agora',
    });
    const abre_em = '2026-11-18T08:00:00-03:00';
    expect(
      (
        await chamar('PUT', '/turmas/7/jornada/aulas/11/abertura', 1, {
          modo: 'agendar',
          abre_em,
        })
      ).statusCode,
    ).toBe(200);
    expect(service.definirAbertura).toHaveBeenLastCalledWith(1, 7, 11, {
      modo: 'agendar',
      abre_em,
    });
  });

  it('recusa modo desconhecido, data sem fuso e agendamento sem data', async () => {
    const abertura = '/turmas/7/jornada/aulas/11/abertura';
    expect(
      (await chamar('PUT', abertura, 5, { modo: 'depois' })).statusCode,
    ).toBe(400);
    expect(
      (
        await chamar('PUT', abertura, 5, {
          modo: 'agendar',
          abre_em: '2026-11-18T08:00',
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await chamar('PUT', abertura, 5, { modo: 'agendar' })).statusCode,
    ).toBe(400);
    expect(service.definirAbertura).not.toHaveBeenCalled();
  });

  it('valida a lista de módulos', async () => {
    const url = '/turmas/7/jornada/modulos';
    expect(
      (
        await chamar('PUT', url, 5, {
          modulo_ids: Array.from({ length: 51 }, (_, i) => i + 1),
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await chamar('PUT', url, 5, { modulo_ids: [1, 1] })).statusCode,
    ).toBe(400);
    expect((await chamar('PUT', url, 5, { modulo_ids: [] })).statusCode).toBe(
      200,
    );
    expect(service.salvarModulos).toHaveBeenCalledWith(5, 7, []);
  });

  it('cancela agendamento e lista alunos', async () => {
    expect(
      (await chamar('DELETE', '/turmas/7/jornada/aulas/11/abertura', 5))
        .statusCode,
    ).toBe(200);
    expect(service.cancelarAbertura).toHaveBeenCalledWith(5, 7, 11);
    expect(
      (await chamar('GET', '/turmas/7/alunos?page=1&busca=ana', 5)).statusCode,
    ).toBe(200);
    expect(service.alunosDaTurma).toHaveBeenCalledWith(5, 7, {
      page: 1,
      busca: 'ana',
    });
  });
});
