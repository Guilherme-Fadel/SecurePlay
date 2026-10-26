import { Controller, Get, Req, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { PassportModule } from '@nestjs/passport';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import cookie from '@fastify/cookie';
import WebSocket, { RawData } from 'ws';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { JwtStrategy } from '../../src/auth/jwt.strategy';
import { JwtAuthGuard } from '../../src/auth/auth.guard';
import { CsrfGuard } from '../../src/auth/csrf.guard';
import { SocketSessionService } from '../../src/auth/socket-session.service';
import { UsuarioService } from '../../src/usuario/usuario.service';
import { Usuario } from '../../src/usuario/usuario.entity';
import { AppGateway } from '../../src/gateway/app.gateway';
import { SocketIoAdapter } from '../../src/gateway/socket-io.adapter';
import { arcadeFixture } from './arcade-fixture';

export const SESSION_FIXTURE_SECRET =
  'fixture-session-secret-not-for-production-123456';
export const SESSION_FIXTURE_ORIGIN = 'http://localhost:5173';

@Controller('fixture')
class SessionProbeController {
  @Get('protected')
  identity(
    @Req() request: { user: { userId: number; sessionVersion: number } },
  ) {
    return request.user;
  }
}

/** Módulo mínimo real: sem AppModule, .env, e-mail ou S3. */
export async function sessionApplication(
  f: Awaited<ReturnType<typeof arcadeFixture>>,
  productionAdapter = false,
) {
  const jwt = new JwtService({
    secret: SESSION_FIXTURE_SECRET,
    signOptions: { expiresIn: '2h' },
  });
  const users = new UsuarioService(
    f.source.getRepository(Usuario),
    {} as never,
  );
  const validator = new SocketSessionService(jwt, users, f.redis);
  const previous = process.env.JWT_SECRET;
  let strategy: JwtStrategy;
  try {
    process.env.JWT_SECRET = SESSION_FIXTURE_SECRET;
    strategy = new JwtStrategy(users);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
  const module = await Test.createTestingModule({
    imports: [
      PassportModule.register({ defaultStrategy: 'jwt' }),
      EventEmitterModule.forRoot(),
    ],
    controllers: [AuthController, SessionProbeController],
    providers: [
      { provide: UsuarioService, useValue: users },
      { provide: SocketSessionService, useValue: validator },
      { provide: JwtStrategy, useValue: strategy },
      {
        provide: AuthService,
        inject: [EventEmitter2],
        useFactory: (events: EventEmitter2) =>
          new AuthService(
            users,
            jwt,
            f.redis,
            new ConfigService({ NODE_ENV: 'test' }),
            {} as never,
            events,
          ),
      },
      AppGateway,
    ],
  }).compile();
  const app = module.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    { logger: false },
  );
  await app.register(cookie);
  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new JwtAuthGuard(f.redis, reflector),
    new CsrfGuard(reflector),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  if (productionAdapter) app.useWebSocketAdapter(new SocketIoAdapter(app));
  await app.listen(0, '127.0.0.1');
  const gateway = app.get(AppGateway);
  return {
    app,
    jwt,
    users,
    validator,
    gateway,
    auth: app.get(AuthService),
    events: app.get(EventEmitter2),
    url: await app.getUrl(),
  };
}

export function tokenCookie(token: string) {
  return `token=${encodeURIComponent(token)}`;
}

/** Cliente Engine.IO/Socket.IO mínimo e independente; ws já é dependência do servidor. */
export function independentSocket(
  url: string,
  token: string,
  origin: string | null = SESSION_FIXTURE_ORIGIN,
) {
  let socketId: string | undefined;
  const socket = new WebSocket(
    `${url.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`,
    {
      headers: {
        Cookie: tokenCookie(token),
        ...(origin ? { Origin: origin } : {}),
      },
    },
  );
  const notifications: unknown[] = [];
  let readyResolve!: () => void;
  let readyReject!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  const closed = new Promise<void>((resolve) => {
    socket.once('close', () => resolve());
  });
  let notificationResolve: ((value: unknown) => void) | undefined;
  socket.on('error', (error) => readyReject(error));
  socket.on('message', (raw: RawData) => {
    const bytes = Buffer.isBuffer(raw)
      ? raw
      : Array.isArray(raw)
        ? Buffer.concat(raw)
        : Buffer.from(raw);
    const message = bytes.toString('utf8');
    if (message.startsWith('0')) socket.send('40');
    else if (message === '2') socket.send('3');
    else if (message.startsWith('40')) {
      socketId = (JSON.parse(message.slice(2)) as { sid: string }).sid;
      readyResolve();
    } else if (message.startsWith('42')) {
      const packet = JSON.parse(message.slice(2)) as [string, unknown];
      if (packet[0] === 'new-notification') {
        notifications.push(packet[1]);
        notificationResolve?.(packet[1]);
      }
    }
  });
  socket.on('close', () =>
    readyReject(new Error('Socket encerrado antes de autenticar')),
  );
  return {
    socket,
    ready,
    closed,
    notifications,
    get id() {
      return socketId;
    },
    nextNotification: () =>
      new Promise<unknown>((resolve) => {
        notificationResolve = resolve;
      }),
    close: () => {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      )
        socket.close();
    },
  };
}

export async function connectedSocket(
  application: Awaited<ReturnType<typeof sessionApplication>>,
  token: string,
  origin: string = SESSION_FIXTURE_ORIGIN,
) {
  const client = independentSocket(application.url, token, origin);
  await client.ready;
  const server = application.gateway.server;
  for (let attempt = 0; attempt < 100; attempt++) {
    const socket = client.id
      ? server.sockets.sockets.get(client.id)
      : undefined;
    const data = socket?.data as { tokenHash?: string } | undefined;
    if (
      data?.tokenHash &&
      socket &&
      [...socket.rooms].some((room) => room.startsWith('user_'))
    ) {
      await application.gateway.revalidateConnections();
      return client;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  client.close();
  throw new Error('Fixture socket não concluiu autenticação');
}
