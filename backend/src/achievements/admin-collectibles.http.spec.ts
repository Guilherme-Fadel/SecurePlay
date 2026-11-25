import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AdminCollectiblesController } from './admin-collectibles.controller';
import { AdminCollectiblesService } from './admin-collectibles.service';
import { AdminCollectiblesArtService } from './admin-collectibles-art.service';
import { RolesGuard } from '../auth/roles.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import { Role } from '../auth/roles.enum';

// Identidade é fixture: o teste cobre RolesGuard e validação de DTO, não JWT/CSRF.
describe('HTTP — cadastro de colecionáveis', () => {
  let app: NestFastifyApplication;
  const service = {
    listItems: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    listKits: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    createKit: jest.fn().mockResolvedValue({ id: 1 }),
    publish: jest.fn().mockResolvedValue({ id: 1, active: true }),
    remove: jest.fn().mockResolvedValue({ ok: true }),
  };
  const artService = {
    createUpload: jest.fn().mockResolvedValue({ key: 'k' }),
    confirm: jest.fn().mockResolvedValue({ artKey: 'a', artUrl: 'u' }),
  };
  const identities = new Map([
    [1, { userId: 1, role: Role.ADMIN, empresa_id: 10 }],
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
      controllers: [AdminCollectiblesController],
      providers: [
        { provide: AdminCollectiblesService, useValue: service },
        { provide: AdminCollectiblesArtService, useValue: artService },
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
    ['GET', '/admin/collectibles/items'],
    ['GET', '/admin/collectibles/kits'],
    ['POST', '/admin/collectibles/kits'],
    ['POST', '/admin/collectibles/kits/1/publish'],
    ['DELETE', '/admin/collectibles/kits/1'],
    ['POST', '/admin/collectibles/art/upload'],
    ['POST', '/admin/collectibles/art/confirm'],
  ] as const)('barra admin de escola e aluno em %s %s', async (method, url) => {
    for (const user of ['1', '3']) {
      const result = await app.inject({
        method,
        url,
        headers: headers(user),
        payload: method === 'POST' ? {} : undefined,
      });
      expect(result.statusCode).toBe(403);
    }
    expect(service.listItems).not.toHaveBeenCalled();
    expect(service.createKit).not.toHaveBeenCalled();
    expect(artService.confirm).not.toHaveBeenCalled();
  });

  it('platform_admin lista com página e busca', async () => {
    const result = await app.inject({
      method: 'GET',
      url: '/admin/collectibles/items?page=2&search=natal',
      headers: headers('9'),
    });
    expect(result.statusCode).toBe(200);
    expect(service.listItems).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, search: 'natal' }),
    );
  });

  it('repassa os filtros de encaixe e estado e recusa valores desconhecidos', async () => {
    const ok = await app.inject({
      method: 'GET',
      url: '/admin/collectibles/items?type=head&status=inactive',
      headers: headers('9'),
    });
    expect(ok.statusCode).toBe(200);
    expect(service.listItems).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'head', status: 'inactive' }),
    );
    const kits = await app.inject({
      method: 'GET',
      url: '/admin/collectibles/kits?status=active',
      headers: headers('9'),
    });
    expect(kits.statusCode).toBe(200);
    expect(service.listKits).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    );
    for (const url of [
      '/admin/collectibles/items?type=hat',
      '/admin/collectibles/items?status=archived',
      '/admin/collectibles/kits?status=all',
    ]) {
      const bad = await app.inject({
        method: 'GET',
        url,
        headers: headers('9'),
      });
      expect(bad.statusCode).toBe(400);
    }
    expect(service.listItems).toHaveBeenCalledTimes(1);
    expect(service.listKits).toHaveBeenCalledTimes(1);
  });

  it('valida o corpo do kit antes de chamar o serviço', async () => {
    const result = await app.inject({
      method: 'POST',
      url: '/admin/collectibles/kits',
      headers: headers('9'),
      payload: { name: 'x', pieces: [{ type: 'hat', name: 'Chapéu' }] },
    });
    expect(result.statusCode).toBe(400);
    expect(service.createKit).not.toHaveBeenCalled();
  });

  it('publica com o ator da sessão e recusa tipo desconhecido na rota', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: '/admin/collectibles/kits/1/publish',
      headers: headers('9'),
    });
    expect(ok.statusCode).toBe(201);
    expect(service.publish).toHaveBeenCalledWith(9, 'kits', 1);
    const bad = await app.inject({
      method: 'POST',
      url: '/admin/collectibles/pieces/1/publish',
      headers: headers('9'),
    });
    expect(bad.statusCode).toBe(400);
  });

  it('confirma arte com a chave enviada', async () => {
    const result = await app.inject({
      method: 'POST',
      url: '/admin/collectibles/art/confirm',
      headers: headers('9'),
      payload: { key: 'collectibles/tmp/x.png' },
    });
    expect(result.statusCode).toBe(201);
    expect(artService.confirm).toHaveBeenCalledWith('collectibles/tmp/x.png');
  });

  it('platform_admin exclui por tipo e id; tipo ou id inválido é 400', async () => {
    const ok = await app.inject({
      method: 'DELETE',
      url: '/admin/collectibles/items/4',
      headers: headers('9'),
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ ok: true });
    expect(service.remove).toHaveBeenCalledWith(9, 'items', 4);
    for (const url of [
      '/admin/collectibles/things/4',
      '/admin/collectibles/kits/abc',
    ]) {
      const bad = await app.inject({
        method: 'DELETE',
        url,
        headers: headers('9'),
      });
      expect(bad.statusCode).toBe(400);
    }
    expect(service.remove).toHaveBeenCalledTimes(1);
  });
});
