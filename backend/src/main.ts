import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SocketIoAdapter } from './gateway/socket-io.adapter';
import fastifyCookie from '@fastify/cookie';
import {
  getAllowedOrigins,
  isAllowedOrigin,
  isDevEnvironment,
  isLocalOrigin,
} from './config/origins';

function getTrustProxy(): boolean | number {
  const configuredHops = Number(process.env.TRUST_PROXY ?? 0);
  return Number.isInteger(configuredHops) && configuredHops > 0
    ? configuredHops
    : false;
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: getTrustProxy(),
      logger: {
        redact: ['req.headers.authorization', 'req.body.token'],
      },
    }),
  );

  await app.register(fastifyCookie);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const allowedOrigins = getAllowedOrigins();
  const allowLocalDev = isDevEnvironment();

  app.enableCors({
    origin: (origin, callback) => {
      // Requisicoes sem origin (curl, mobile, same-origin) sao liberadas.
      if (!origin) {
        callback(null, true);
        return;
      }

      // Em desenvolvimento libera qualquer localhost/127.0.0.1 em qualquer porta.
      if (allowLocalDev && isLocalOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(null, isAllowedOrigin(origin, allowedOrigins));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  app.useWebSocketAdapter(new SocketIoAdapter(app));

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
