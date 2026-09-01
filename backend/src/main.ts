import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SocketIoAdapter } from './gateway/socket-io.adapter';
import fastifyCookie from '@fastify/cookie';
import { getAllowedOrigins } from './config/origins';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: {
        redact: ['req.headers.authorization', 'req.body.token'],
      },
    }),
  );

  await app.register(fastifyCookie);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const allowedOrigins = getAllowedOrigins();

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useWebSocketAdapter(new SocketIoAdapter(app));

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
