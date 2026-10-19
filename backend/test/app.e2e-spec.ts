import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppController } from '../src/app.controller';
import { JwtAuthGuard } from '../src/auth/auth.guard';
import { RedisService } from '../src/redis/redis.service';

// Smoke HTTP isolado: não importa AppModule nem carrega .env, banco, seeds ou
// agendamentos. Não substitui o E2E autenticado com infraestrutura descartável.
describe('AppController — saúde pública com Fastify', () => {
  let app: NestFastifyApplication;
  const redis = {
    get: jest.fn(() => {
      throw new Error('Saúde pública não deve consultar Redis');
    }),
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: RedisService, useValue: redis },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each(['/', '/health'])(
    '%s responde sem sessão ou dependências externas',
    async (url) => {
      const response = await app.inject({ method: 'GET', url });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
      expect(redis.get).not.toHaveBeenCalled();
    },
  );
});
