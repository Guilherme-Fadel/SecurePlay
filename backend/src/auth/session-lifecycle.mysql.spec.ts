import * as bcrypt from 'bcrypt';
import { arcadeFixture } from '../../test/fixtures/arcade-fixture';
import {
  connectedSocket,
  independentSocket,
  sessionApplication,
  SESSION_FIXTURE_ORIGIN,
  tokenCookie,
} from '../../test/fixtures/session-fixture';
import { sessionPayload, sessionTokenHash } from './session';
import { Usuario } from '../usuario/usuario.entity';
import { Role } from './roles.enum';
import { JwtService } from '@nestjs/jwt';
import { SESSION_FIXTURE_SECRET } from '../../test/fixtures/session-fixture';
import { ConvitesService } from '../admin/convites.service';
import { Empresa } from '../empresa/empresa.entity';
import { SocketSessionService } from './socket-session.service';

const isolated =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;
isolated(
  'C11/C12 — senha, HTTP e WebSocket independentes em MySQL/Redis',
  () => {
    let f: Awaited<ReturnType<typeof arcadeFixture>>;
    let a: Awaited<ReturnType<typeof sessionApplication>>;
    let b: Awaited<ReturnType<typeof sessionApplication>>;
    let user: Usuario;
    let token: string;
    const clients: Array<ReturnType<typeof independentSocket>> = [];
    const currentPassword = 'fixture-senha-atual';
    const newPassword = 'fixture-nova-senha';
    const current = () =>
      f.source.getRepository(Usuario).findOneByOrFail({ id: user.id });
    const identity = (credential: string) =>
      a.app.inject({
        method: 'GET',
        url: '/fixture/protected',
        headers: { cookie: tokenCookie(credential) },
      });
    const password = (
      credential = token,
      payload = { currentPassword, newPassword },
    ) =>
      a.app.inject({
        method: 'PATCH',
        url: '/auth/password',
        headers: {
          cookie: tokenCookie(credential),
          origin: SESSION_FIXTURE_ORIGIN,
        },
        payload,
      });
    const logout = (credential = token) =>
      a.app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          cookie: tokenCookie(credential),
          origin: SESSION_FIXTURE_ORIGIN,
        },
      });
    const connect = async (application = a, credential = token) => {
      const client = await connectedSocket(application, credential);
      clients.push(client);
      return client;
    };
    const notification = () => ({
      usuario_id: user.id,
      id: 1,
      title: 'Fixture',
      message: 'Fixture',
      type: 'achievement',
      created_at: new Date(),
    });
    beforeAll(async () => {
      f = await arcadeFixture();
      a = await sessionApplication(f);
      b = await sessionApplication(f);
    }, 60_000);
    beforeEach(async () => {
      user = await f.source.getRepository(Usuario).save({
        name: 'Sessão Fixture',
        password: await bcrypt.hash(currentPassword, 4),
        empresa_id: f.company.id,
        role: Role.USER,
      });
      token = a.jwt.sign(sessionPayload(user));
    });
    afterEach(async () => {
      jest.restoreAllMocks();
      await f.source.query('DROP TRIGGER IF EXISTS session_failure');
      for (const client of clients.splice(0)) {
        client.close();
        await client.closed;
      }
    });
    afterAll(async () => {
      await a?.app.close();
      await b?.app.close();
      f?.redis.onModuleDestroy();
      await f?.source.destroy();
    });

    it('troca senha, renova cookie e rejeita JWT antigo em HTTP e handshake', async () => {
      const response = await password();
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        message: 'Senha alterada com sucesso',
      });
      const setCookie = String(response.headers['set-cookie']);
      const renewed = decodeURIComponent(setCookie.match(/token=([^;]+)/)![1]);
      expect((await identity(token)).statusCode).toBe(401);
      expect((await identity(renewed)).statusCode).toBe(200);
      expect((await current()).session_version).toBe(1);
      expect(
        await bcrypt.compare(newPassword, (await current()).password),
      ).toBe(true);
      const stale = independentSocket(a.url, token);
      clients.push(stale);
      await stale.ready.catch(() => undefined);
      await stale.closed;
      expect(stale.notifications).toHaveLength(0);
    });

    it('senha errada não troca hash nem encerra sessão', async () => {
      const old = (await current()).password;
      expect(
        (await password(token, { currentPassword: 'incorreta', newPassword }))
          .statusCode,
      ).toBe(400);
      expect((await current()).password).toBe(old);
      expect((await identity(token)).statusCode).toBe(200);
    });

    it('falha SQL reverte senha/versão e não emite revogação', async () => {
      const client = await connect();
      await f.source.query(
        "CREATE TRIGGER session_failure BEFORE UPDATE ON usuario FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fixture password failure'",
      );
      expect((await password()).statusCode).toBe(500);
      expect((await current()).session_version).toBe(0);
      expect((await identity(token)).statusCode).toBe(200);
      expect(client.socket.readyState).toBe(1);
    });

    it('duas trocas concorrentes da mesma versão confirmam somente uma', async () => {
      const results = await Promise.all([
        password(),
        password(token, {
          currentPassword,
          newPassword: 'fixture-outra-senha',
        }),
      ]);
      expect(
        results.filter((response) => response.statusCode === 200),
      ).toHaveLength(1);
      expect((await current()).session_version).toBe(1);
    });

    it('revogação entre verificação bcrypt e lock rejeita a troca', async () => {
      const snapshot = await current();
      await f.source
        .getRepository(Usuario)
        .update(user.id, { session_version: 1 });
      jest.spyOn(a.users, 'getUsuarioById').mockResolvedValueOnce(snapshot);
      await expect(
        a.auth.changePassword(user.id, { currentPassword, newPassword }, 0),
      ).rejects.toThrow('Sessão alterada');
      expect(
        await bcrypt.compare(currentPassword, (await current()).password),
      ).toBe(true);
    });

    it('gravação atrasada de perfil não restaura senha/versão antigas', async () => {
      const snapshot = await current();
      expect((await password()).statusCode).toBe(200);
      jest.spyOn(a.users, 'getUsuarioById').mockResolvedValueOnce(snapshot);
      await a.users.requestNickname(user.id, 'Guardião Fixture');
      expect((await current()).session_version).toBe(1);
      expect(
        await bcrypt.compare(newPassword, (await current()).password),
      ).toBe(true);
      expect((await current()).nickname_pending).toBe('Guardião Fixture');
    });

    it('mudança invalida links reset/setup pendentes na mesma confirmação', async () => {
      await f.source.getRepository(Usuario).update(user.id, {
        password_reset_token_hash: 'fixture-reset',
        password_reset_expires_at: new Date(Date.now() + 60_000),
        password_setup_token_hash: 'fixture-setup',
        password_setup_expires_at: new Date(Date.now() + 60_000),
      });
      expect((await password()).statusCode).toBe(200);
      expect(await current()).toMatchObject({
        password_reset_token_hash: null,
        password_reset_expires_at: null,
        password_setup_token_hash: null,
        password_setup_expires_at: null,
      });
    });

    it('renova Bearer explicitamente mantendo CSRF/Origin', async () => {
      const response = await a.app.inject({
        method: 'PATCH',
        url: '/auth/password',
        headers: {
          authorization: `Bearer ${token}`,
          origin: SESSION_FIXTURE_ORIGIN,
        },
        payload: { currentPassword, newPassword },
      });
      expect(response.statusCode).toBe(200);
      expect(
        (await identity(response.json<{ token: string }>().token)).statusCode,
      ).toBe(200);
      expect(response.headers['cache-control']).toContain('no-store');
    });

    it('logout por Bearer revoga exatamente a sessão autenticada', async () => {
      const response = await a.app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          authorization: `Bearer ${token}`,
          origin: SESSION_FIXTURE_ORIGIN,
        },
      });
      expect(response.statusCode).toBe(200);
      expect((await identity(token)).statusCode).toBe(401);
      expect(
        await f.redis.get(`session-revoked:${sessionTokenHash(token)}`),
      ).toBe('1');
    });

    it('cookie prevalece sobre Bearer também ao revogar', async () => {
      const other = a.jwt.sign(sessionPayload(user));
      const response = await a.app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          cookie: tokenCookie(token),
          authorization: `Bearer ${other}`,
          origin: SESSION_FIXTURE_ORIGIN,
        },
      });
      expect(response.statusCode).toBe(200);
      expect((await identity(token)).statusCode).toBe(401);
      expect((await identity(other)).statusCode).toBe(200);
    });

    it('dois logins no mesmo segundo recebem sessões distintas', async () => {
      await f.source
        .getRepository(Usuario)
        .update(user.id, { username: `fixture${user.id}` });
      const result = await Promise.all(
        [1, 2].map(() =>
          a.auth.signIn({
            identifier: `fixture${user.id}`,
            password: currentPassword,
          }),
        ),
      );
      expect(result[0].token).not.toBe(result[1].token);
    });

    it('cliente independente recebe notificação e fecha no logout sem frontend', async () => {
      const client = await connect();
      const next = client.nextNotification();
      await a.gateway.handleNotificationCreated(notification());
      await next;
      expect(client.notifications).toHaveLength(1);
      expect((await logout()).statusCode).toBe(200);
      await client.closed;
      await a.gateway.handleNotificationCreated(notification());
      expect(client.notifications).toHaveLength(1);
    });

    it('troca de senha encerra sockets antigos e aceita socket renovado', async () => {
      const client = await connect();
      const response = await password();
      expect(response.statusCode).toBe(200);
      await client.closed;
      const renewed = decodeURIComponent(
        String(response.headers['set-cookie']).match(/token=([^;]+)/)![1],
      );
      const fresh = await connect(a, renewed);
      const next = fresh.nextNotification();
      await a.gateway.handleNotificationCreated(notification());
      await next;
      expect(fresh.notifications).toHaveLength(1);
    });

    it('outra instância consulta blacklist antes do envio e fecha a conexão', async () => {
      const client = await connect(b);
      expect((await logout()).statusCode).toBe(200);
      await b.gateway.handleNotificationCreated(notification());
      await client.closed;
      expect(client.notifications).toHaveLength(0);
    });

    it('notificação posterior ao logout não reaproveita validação prévia em andamento', async () => {
      const client = await connect(b);
      let observed!: () => void;
      let release!: () => void;
      const seen = new Promise<void>((resolve) => {
        observed = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const original = new SocketSessionService(b.jwt, b.users, f.redis);
      jest
        .spyOn(b.validator, 'validate')
        .mockImplementationOnce(async (session) => {
          const snapshot = await original.validate(session);
          observed();
          await gate;
          return snapshot;
        });
      const scanning = b.gateway.revalidateConnections();
      try {
        await seen;
        expect((await logout()).statusCode).toBe(200);
        const notificationAfterLogout =
          b.gateway.handleNotificationCreated(notification());
        release();
        await scanning;
        await notificationAfterLogout;
        await client.closed;
        expect(client.notifications).toHaveLength(0);
      } finally {
        release();
        await scanning;
      }
    });

    it('outra instância detecta versão revogada em varredura sem notificação', async () => {
      const client = await connect(b);
      expect((await password()).statusCode).toBe(200);
      await b.gateway.revalidateConnections();
      await client.closed;
      expect(client.notifications).toHaveLength(0);
    });

    it('expiração JWT encerra conexão ociosa', async () => {
      const short = a.jwt.sign(sessionPayload(user), { expiresIn: 2 });
      const client = await connect(a, short);
      await client.closed;
      expect(client.notifications).toHaveLength(0);
    }, 10_000);

    it('Redis indisponível não confirma logout nem envia notificação', async () => {
      const client = await connect();
      jest
        .spyOn(f.redis, 'eval')
        .mockRejectedValueOnce(new Error('fixture redis unavailable'));
      expect((await logout()).statusCode).toBe(500);
      jest
        .spyOn(f.redis, 'get')
        .mockRejectedValueOnce(new Error('fixture redis unavailable'));
      await a.gateway.handleNotificationCreated(notification());
      await client.closed;
      expect(client.notifications).toHaveLength(0);
    });

    it('logout de uma sessão não fecha a outra sessão do mesmo usuário', async () => {
      const first = await connect();
      const another = a.jwt.sign(sessionPayload(user));
      const second = await connect(a, another);
      expect((await logout()).statusCode).toBe(200);
      await first.closed;
      const next = second.nextNotification();
      await a.gateway.handleNotificationCreated(notification());
      await next;
      expect(second.notifications).toHaveLength(1);
    });

    it('trial expira e encerra socket ocioso antes do JWT', async () => {
      await f.source
        .getRepository(Usuario)
        .update(user.id, { trial_ends_at: new Date(Date.now() + 2000) });
      const client = await connect();
      await client.closed;
      expect(client.notifications).toHaveLength(0);
    }, 10_000);

    it('token assinado sem expiração não cria socket persistente', async () => {
      const noExpiry = new JwtService({ secret: SESSION_FIXTURE_SECRET }).sign(
        sessionPayload(user),
      );
      expect((await identity(noExpiry)).statusCode).toBe(401);
      const client = independentSocket(a.url, noExpiry);
      clients.push(client);
      await client.ready.catch(() => undefined);
      await client.closed;
      expect(client.notifications).toHaveLength(0);
    });

    it('cookie continua protegido por Origin e não expõe token no corpo', async () => {
      const response = await a.app.inject({
        method: 'PATCH',
        url: '/auth/password',
        headers: { cookie: tokenCookie(token) },
        payload: { currentPassword, newPassword },
      });
      expect(response.statusCode).toBe(403);
      expect((await identity(token)).statusCode).toBe(200);
    });

    it.each([null, 'https://origem-hostil.example'])(
      'upgrade WebSocket recusa origem não permitida mesmo com cookie válido: %s',
      async (origin) => {
        expect((await identity(token)).statusCode).toBe(200);
        const client = independentSocket(a.url, token, origin);
        clients.push(client);
        await expect(client.ready).rejects.toThrow();
        await client.closed;
        expect(client.notifications).toHaveLength(0);
      },
    );

    it('produção aceita allowlist explícita e não libera exceção de localhost', async () => {
      const previousEnvironment = process.env.NODE_ENV;
      const previousOrigins = process.env.CORS_ORIGIN;
      let production:
        | Awaited<ReturnType<typeof sessionApplication>>
        | undefined;
      try {
        process.env.NODE_ENV = 'production';
        process.env.CORS_ORIGIN = 'https://escola.fixture.example';
        production = await sessionApplication(f, true);
        const denied = independentSocket(
          production.url,
          token,
          SESSION_FIXTURE_ORIGIN,
        );
        clients.push(denied);
        await expect(denied.ready).rejects.toThrow();
        await denied.closed;
        const allowed = await connectedSocket(
          production,
          token,
          'https://escola.fixture.example',
        );
        clients.push(allowed);
        const next = allowed.nextNotification();
        await production.gateway.handleNotificationCreated(notification());
        await next;
        expect(allowed.notifications).toHaveLength(1);
      } finally {
        await production?.app.close();
        if (previousEnvironment === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnvironment;
        if (previousOrigins === undefined) delete process.env.CORS_ORIGIN;
        else process.env.CORS_ORIGIN = previousOrigins;
      }
    });

    it.each(['aprovarApelidoDaEmpresa', 'rejeitarApelidoDaEmpresa'] as const)(
      'decisão administrativa atrasada não restaura sessão antiga: %s',
      async (method) => {
        await f.source
          .getRepository(Usuario)
          .update(user.id, { nickname_pending: 'Guardião Fixture' });
        const snapshot = await current();
        expect((await password()).statusCode).toBe(200);
        const repository = f.source.getRepository(Usuario);
        jest.spyOn(repository, 'findOne').mockResolvedValueOnce(snapshot);
        const admin = new ConvitesService(
          {} as never,
          repository,
          f.source.getRepository(Empresa),
          {} as never,
          {} as never,
          f.events,
          f.source,
        );
        await admin[method](f.company.id, user.id);
        expect((await current()).session_version).toBe(1);
        expect(
          await bcrypt.compare(newPassword, (await current()).password),
        ).toBe(true);
      },
    );
  },
);
