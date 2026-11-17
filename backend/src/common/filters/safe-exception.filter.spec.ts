import {
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Post,
  Body,
  ValidationPipe,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import { QueryFailedError } from 'typeorm';
import { SafeExceptionFilter } from './safe-exception.filter';

class DadosDto {
  @IsString()
  nome!: string;

  @IsString()
  email!: string;
}

@Controller('teste')
class TesteController {
  @Get('banco')
  banco() {
    const driverError = Object.assign(
      new Error('Data too long: segredo@exemplo.com'),
      {
        code: 'ER_DATA_TOO_LONG',
      },
    );
    throw new QueryFailedError(
      'INSERT INTO usuario (email) VALUES (?)',
      ['segredo@exemplo.com'],
      driverError,
    );
  }

  @Get('proibido')
  proibido() {
    throw new ForbiddenException('Acesso negado ao recurso');
  }

  @Post('validar')
  validar(@Body() dados: DadosDto) {
    return { ok: !!dados };
  }
}

describe('SafeExceptionFilter', () => {
  let app: NestFastifyApplication;
  let logs: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TesteController],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(
      new SafeExceptionFilter(app.get(HttpAdapterHost).httpAdapter),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    logs = [];
    const coletar = (...args: unknown[]) => {
      logs.push(args.map((a) => JSON.stringify(a) ?? String(a)).join(' '));
    };
    jest.spyOn(Logger.prototype, 'error').mockImplementation(coletar);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(coletar);
    jest.spyOn(console, 'error').mockImplementation(coletar);
    jest.spyOn(console, 'log').mockImplementation(coletar);
  });

  afterEach(() => jest.restoreAllMocks());

  it('QueryFailedError não registra parâmetros', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/teste/banco?email=segredo@exemplo.com',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      statusCode: 500,
      message: 'Erro interno do servidor',
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('QueryFailedError');
    expect(logs[0]).toContain('ER_DATA_TOO_LONG');
    expect(logs[0]).toContain('GET /teste/banco');
    const tudo = logs.join('\n') + response.body;
    expect(tudo).not.toContain('segredo@exemplo.com');
    expect(tudo).not.toContain('INSERT');
    expect(tudo).not.toContain('usuario');
  });

  it('HttpException mantém status e corpo originais', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/teste/proibido',
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      message: 'Acesso negado ao recurso',
      error: 'Forbidden',
      statusCode: 403,
    });
  });

  it('erro de validação mantém 400 com a lista de mensagens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/teste/validar',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const corpo = response.json<{ message: string[]; error: string }>();
    expect(corpo.error).toBe('Bad Request');
    expect(corpo.message).toEqual(
      expect.arrayContaining([
        'nome must be a string',
        'email must be a string',
      ]),
    );
  });
});
