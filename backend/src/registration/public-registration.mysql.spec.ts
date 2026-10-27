import { ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import {
  PublicRegistrationService,
  PUBLIC_REGISTRATION_RESPONSE,
} from './public-registration.service';
import { PendingRegistration } from './pending-registration.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Empresa } from '../empresa/empresa.entity';
import { Convite } from '../admin/entities/convite.entity';
import { RedisService } from '../redis/redis.service';
import { Role } from '../auth/roles.enum';

const isolated =
  process.env.RUN_REGISTRATION_INTEGRATION === '1' ? describe : describe.skip;
isolated('C20 — respostas públicas em HTTP/MySQL/Redis descartáveis', () => {
  let source: DataSource;
  let redis: RedisService;
  let app: NestFastifyApplication;
  let company: Empresa;
  const email = {
    sendVerification: jest.fn(),
    sendPasswordSetup: jest.fn(),
    sendAccessGuidance: jest.fn(),
  };
  const dto = (address: string) => ({
    name: 'Pessoa Fixture',
    email: address,
    birth_date: '1990-02-28',
  });
  const post = (url: string, payload: object) =>
    app.inject({ method: 'POST', url: '/registration/' + url, payload });
  const guidanceKey = (address: string) =>
    'registration:guidance:' +
    createHash('sha256').update(address).digest('hex');
  const guidedAddresses = [
    ...[Role.USER, Role.ADMIN, Role.PLATFORM_ADMIN].map(
      (role) => `${role}-c20@example.test`,
    ),
    'parallel-c20@example.test',
    'guidance-failure-c20@example.test',
    'redis-failure-c20@example.test',
    'legacy-c20@example.test',
  ];
  const clearFixtureGuidance = () =>
    Promise.all(
      guidedAddresses.map((address) => redis.del(guidanceKey(address))),
    );
  const createUser = (
    address: string,
    role = Role.USER,
    extra: Partial<Usuario> = {},
  ) =>
    source.getRepository(Usuario).save({
      name: 'Conta Fixture',
      email: address,
      role,
      empresa_id: company.id,
      password: 'fixture-unchanged-hash',
      session_version: 3,
      email_verified_at: new Date(),
      ...extra,
    });
  beforeAll(async () => {
    const port = (name: string) => {
      const value = Number(process.env[name]);
      if (!Number.isInteger(value) || value < 1024 || value > 65535)
        throw new Error('Informe portas descartáveis C20');
      return value;
    };
    source = await new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port: port('REGISTRATION_MYSQL_PORT'),
      username: 'root',
      password: 'arcade-fixture-only',
      database: 'arcade_completion_fixture',
      entities: [Usuario, Empresa, Convite, PendingRegistration],
      synchronize: true,
      dropSchema: true,
      logging: false,
    }).initialize();
    redis = new RedisService(
      new ConfigService({
        REDIS_URL: `redis://127.0.0.1:${port('REGISTRATION_REDIS_PORT')}`,
      }),
    );
    redis.onModuleInit();
    await redis.get('fixture-ready');
    await clearFixtureGuidance();
    company = await source
      .getRepository(Empresa)
      .save({ nome: 'Escola Fixture C20' });
    const registration = new RegistrationService(source, email as never);
    const publicRegistration = new PublicRegistrationService(
      registration,
      email as never,
      redis,
    );
    const module = await Test.createTestingModule({
      controllers: [RegistrationController],
      providers: [
        { provide: RegistrationService, useValue: registration },
        { provide: PublicRegistrationService, useValue: publicRegistration },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 30_000);
  beforeEach(() => {
    jest.clearAllMocks();
    email.sendVerification.mockResolvedValue(undefined);
    email.sendPasswordSetup.mockResolvedValue(undefined);
    email.sendAccessGuidance.mockResolvedValue(undefined);
  });
  afterAll(async () => {
    await app?.close();
    if (redis) await clearFixtureGuidance();
    redis?.onModuleDestroy();
    if (source?.isInitialized) await source.destroy();
  });

  it('novo, pendente e contas dos três papéis têm corpo/status idênticos sem alterar contas existentes', async () => {
    const fresh = await post('trial', dto('new-c20@example.test'));
    expect(fresh.statusCode).toBe(201);
    expect(fresh.json()).toEqual(PUBLIC_REGISTRATION_RESPONSE);
    const pending = await post('trial', dto('new-c20@example.test'));
    expect(pending.statusCode).toBe(fresh.statusCode);
    expect(pending.body).toBe(fresh.body);
    for (const role of [Role.USER, Role.ADMIN, Role.PLATFORM_ADMIN]) {
      const address = `${role}-c20@example.test`;
      const user = await createUser(address, role);
      const before = await source
        .getRepository(Usuario)
        .findOneByOrFail({ id: user.id });
      const response = await post('trial', dto(address.toUpperCase()));
      expect(response.statusCode).toBe(fresh.statusCode);
      expect(response.body).toBe(fresh.body);
      expect(
        await source.getRepository(Usuario).findOneByOrFail({ id: user.id }),
      ).toEqual(before);
      expect(
        await source
          .getRepository(PendingRegistration)
          .countBy({ email: address }),
      ).toBe(0);
      expect(email.sendAccessGuidance).toHaveBeenCalledWith(
        address,
        expect.any(String),
      );
    }
    expect(email.sendVerification).toHaveBeenCalledTimes(1);
    expect(email.sendAccessGuidance).toHaveBeenCalledTimes(3);
  });

  it('o cooldown Redis por destinatário é atômico entre requisições concorrentes', async () => {
    const address = 'parallel-c20@example.test';
    await createUser(address);
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => post('trial', dto(address))),
    );
    expect(
      responses.every(
        (response) =>
          response.statusCode === 201 &&
          response.json<typeof PUBLIC_REGISTRATION_RESPONSE>().sucesso === true,
      ),
    ).toBe(true);
    expect(email.sendAccessGuidance).toHaveBeenCalledTimes(1);
    expect(await redis.get(guidanceKey(address))).toBeTruthy();
  });

  it('preserva a caixa do endereço legado no envio, normalizando somente a chave de cooldown', async () => {
    const stored = 'Legacy-C20@Example.Test';
    const user = await createUser(stored);
    const response = await post('trial', dto(stored.toLowerCase()));
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(PUBLIC_REGISTRATION_RESPONSE);
    expect(email.sendAccessGuidance).toHaveBeenCalledWith(
      stored,
      expect.any(String),
    );
    expect(
      (await source.getRepository(Usuario).findOneByOrFail({ id: user.id }))
        .email,
    ).toBe(stored);
    expect(await redis.get(guidanceKey(stored.toLowerCase()))).toBeTruthy();
  });

  it('duas criações disputando o índice único retornam a mesma resposta e enviam um único link', async () => {
    const address = 'race-c20@example.test';
    const repository = source.getRepository(PendingRegistration);
    let arrived = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const spy = jest
      .spyOn(repository, 'save')
      .mockImplementation(async (entity) => {
        if (arrived < 2) {
          arrived++;
          if (arrived === 2) release();
          await barrier;
        }
        return source.manager.save(PendingRegistration, entity);
      });
    try {
      const responses = await Promise.all([
        post('trial', dto(address)),
        post('trial', dto(address)),
      ]);
      expect(responses.map((response) => response.statusCode)).toEqual([
        201, 201,
      ]);
      expect(responses[0].body).toBe(responses[1].body);
      expect(responses[0].json()).toEqual(PUBLIC_REGISTRATION_RESPONSE);
      expect(await repository.countBy({ email: address })).toBe(1);
      expect(email.sendVerification).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('falha de entrega inicial não revela se o endereço era novo', async () => {
    email.sendVerification.mockRejectedValueOnce(
      new ServiceUnavailableException('provider fixture'),
    );
    const response = await post('trial', dto('delivery-c20@example.test'));
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(PUBLIC_REGISTRATION_RESPONSE);
    expect(
      await source
        .getRepository(PendingRegistration)
        .countBy({ email: 'delivery-c20@example.test' }),
    ).toBe(1);
  });

  it('falha de orientação libera somente a própria lease e preserva a conta', async () => {
    const address = 'guidance-failure-c20@example.test';
    const user = await createUser(address);
    email.sendAccessGuidance.mockRejectedValueOnce(
      new Error('fixture delivery'),
    );
    const response = await post('trial', dto(address));
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(PUBLIC_REGISTRATION_RESPONSE);
    expect(await redis.get(guidanceKey(address))).toBeNull();
    expect(
      (await source.getRepository(Usuario).findOneByOrFail({ id: user.id }))
        .session_version,
    ).toBe(3);
  });

  it('Redis indisponível não envia orientação sem limite nem muda a resposta pública', async () => {
    const address = 'redis-failure-c20@example.test';
    await createUser(address);
    const spy = jest
      .spyOn(redis, 'acquireLease')
      .mockRejectedValueOnce(new Error('fixture Redis'));
    try {
      const response = await post('trial', dto(address));
      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual(PUBLIC_REGISTRATION_RESPONSE);
      expect(email.sendAccessGuidance).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('reenvio ausente, em cooldown e com convite indisponível devolve o mesmo corpo', async () => {
    const responses = [
      await post('resend', { email: 'missing-c20@example.test' }),
      await post('resend', { email: 'new-c20@example.test' }),
    ];
    await source.getRepository(PendingRegistration).save({
      email: 'unavailable-invite-c20@example.test',
      name: 'Fixture',
      kind: 'invite',
      invite_id: 99999,
      token_hash: 'a'.repeat(64),
      expires_at: new Date(Date.now() + 60_000),
      last_sent_at: new Date(Date.now() - 120_000),
    });
    responses.push(
      await post('resend', { email: 'unavailable-invite-c20@example.test' }),
    );
    for (const response of responses) {
      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual(PUBLIC_REGISTRATION_RESPONSE);
    }
  });

  it('reenvio de definição de senha mantém rollback no erro de e-mail sem resposta reveladora', async () => {
    const address = 'password-setup-c20@example.test';
    const user = await createUser(address, Role.USER, {
      password_change_required: true,
      password_setup_token_hash: 'b'.repeat(64),
      password_setup_expires_at: new Date(Date.now() + 60_000),
      password_setup_last_sent_at: new Date(Date.now() - 120_000),
    });
    email.sendPasswordSetup.mockRejectedValueOnce(
      new ServiceUnavailableException('fixture email'),
    );
    const response = await post('resend', { email: address });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(PUBLIC_REGISTRATION_RESPONSE);
    expect(
      (await source.getRepository(Usuario).findOneByOrFail({ id: user.id }))
        .password_setup_token_hash,
    ).toBe('b'.repeat(64));
  });

  it('validação de formato/data continua antes da consulta de existência', async () => {
    for (const address of [
      'admin-c20@example.test',
      'invalid-new-c20@example.test',
    ]) {
      const response = await post('trial', {
        ...dto(address),
        birth_date: '2999-01-01',
      });
      expect(response.statusCode).toBe(400);
      expect(response.json<{ message: string }>().message).toBe(
        'Data de nascimento inválida',
      );
    }
  });
});
