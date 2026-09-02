import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { getAllowedOrigins, isAllowedOrigin } from '../config/origins';

export class SocketIoAdapter extends IoAdapter {
  constructor(appContext: INestApplicationContext) {
    super(appContext);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const allowedOrigins = getAllowedOrigins();
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      allowRequest: (request, callback) => {
        callback(null, isAllowedOrigin(request.headers.origin, allowedOrigins));
      },
    });
    return server;
  }
}
