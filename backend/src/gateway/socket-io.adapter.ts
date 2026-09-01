import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { getAllowedOrigins } from '../config/origins';

export class SocketIoAdapter extends IoAdapter {
  constructor(appContext: INestApplicationContext) {
    super(appContext);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: getAllowedOrigins(),
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    return server;
  }
}
