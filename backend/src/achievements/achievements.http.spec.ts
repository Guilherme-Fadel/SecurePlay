import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { RolesGuard } from '../auth/roles.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import { Role } from '../auth/roles.enum';

// Identidade é fixture: o teste cobre RolesGuard nas rotas de compra e equipar.
describe('HTTP — Shop de colecionáveis (compra e equipar)', () => {
  let app: NestFastifyApplication;
  const service = {
    getShop: jest.fn().mockResolvedValue({ shop: true }),
    purchase: jest.fn().mockResolvedValue({ shop: true }),
    purchaseKit: jest.fn().mockResolvedValue({ shop: true }),
    equip: jest.fn().mockResolvedValue({ shop: true }),
    unequip: jest.fn().mockResolvedValue({ shop: true }),
  };
  const identities = new Map([
    [1, { userId: 1, role: Role.ADMIN, empresa_id: 10 }],
    [2, { userId: 2, role: Role.TEACHER, empresa_id: 10 }],
    [3, { userId: 3, role: Role.USER, empresa_id: 10 }],
    [9, { userId: 9, role: Role.PLATFORM_ADMIN, empresa_id: null }],
  ]);
  const headers = (user: string) => ({
    origin: 'http://localhost:5173',
    'x-fixture-user': user,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AchievementsController],
      providers: [
        { provide: AchievementsService, useValue: service },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate(context: ExecutionContext) {
              const request = context.switchToHttp().getRequest<{
                user?: unknown;
                headers: Record<string, string>;
              }>();
              request.user = identities.get(
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

  it.each([
    ['/achievements/shop/10/purchase', 'purchase'],
    ['/achievements/shop/kits/3/purchase', 'purchaseKit'],
    ['/achievements/shop/10/equip', 'equip'],
    ['/achievements/shop/type/head/unequip', 'unequip'],
  ] as const)('gestão recebe 403 em POST %s', async (url, method) => {
    for (const user of ['1', '2', '9']) {
      const result = await app.inject({
        method: 'POST',
        url,
        headers: headers(user),
        payload: {},
      });
      expect(result.statusCode).toBe(403);
    }
    expect(service[method]).not.toHaveBeenCalled();
  });

  it.each([
    ['/achievements/shop/10/purchase', 'purchase', [3, 10]],
    ['/achievements/shop/kits/3/purchase', 'purchaseKit', [3, 3]],
    ['/achievements/shop/10/equip', 'equip', [3, 10, undefined]],
    ['/achievements/shop/type/head/unequip', 'unequip', [3, 'head']],
  ] as const)('aluno passa o guard em POST %s', async (url, method, args) => {
    const result = await app.inject({
      method: 'POST',
      url,
      headers: headers('3'),
      payload: {},
    });
    expect(result.statusCode).toBe(201);
    expect(service[method]).toHaveBeenCalledWith(...args);
  });

  it('a vitrine continua aberta à gestão', async () => {
    const result = await app.inject({
      method: 'GET',
      url: '/achievements/shop',
      headers: headers('1'),
    });
    expect(result.statusCode).toBe(200);
    expect(service.getShop).toHaveBeenCalledWith(1);
  });
});
