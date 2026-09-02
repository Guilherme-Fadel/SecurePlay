import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import {
  getAllowedOrigins,
  isAllowedOrigin,
  isDevEnvironment,
  isLocalOrigin,
} from '../config/origins';

export class SocketIoAdapter extends IoAdapter {
  constructor(appContext: INestApplicationContext) {
    super(appContext);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const allowedOrigins = getAllowedOrigins();
    const allowLocalDev = isDevEnvironment();

    const isOriginAllowed = (origin: string | undefined): boolean => {
      if (allowLocalDev && isLocalOrigin(origin)) {
        return true;
      }
      return isAllowedOrigin(origin, allowedOrigins);
    };

    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          callback(null, !origin || isOriginAllowed(origin));
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
      allowRequest: (request, callback) => {
        callback(null, isOriginAllowed(request.headers.origin));
      },
    });
    return server;
  }
}
