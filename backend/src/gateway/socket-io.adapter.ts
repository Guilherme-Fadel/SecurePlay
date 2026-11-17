import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { IncomingMessage } from 'node:http';
import { Server, ServerOptions } from 'socket.io';
import { clientIp } from '../common/security/app-throttler.guard';
import { forwardedClientIp } from '../config/trust-proxy';
import {
  getAllowedOrigins,
  isAllowedOrigin,
  isDevEnvironment,
  isLocalOrigin,
} from '../config/origins';

/** Tamanho máximo de uma mensagem do Socket.IO (o padrão da biblioteca é 1 MB). */
export const WS_MAX_HTTP_BUFFER_SIZE = 100_000;

/**
 * Teto padrão de conexões simultâneas por IP. Fica acima de uma turma inteira atrás do mesmo
 * NAT da escola; ajuste com WS_MAX_CONNECTIONS_PER_IP.
 */
export const WS_DEFAULT_MAX_CONNECTIONS_PER_IP = 100;

export function maxConnectionsPerIpFromEnv(
  raw: string | undefined = process.env.WS_MAX_CONNECTIONS_PER_IP,
): number {
  const value = Number(raw?.trim());
  return Number.isSafeInteger(value) && value > 0
    ? value
    : WS_DEFAULT_MAX_CONNECTIONS_PER_IP;
}

/** Contador de conexões por IP; a vaga é reservada no handshake e liberada no fechamento. */
export class ConnectionLimiter {
  private readonly counts = new Map<string, number>();

  constructor(private readonly maxPerIp: number) {}

  tryAcquire(ip: string): boolean {
    const current = this.counts.get(ip) ?? 0;
    if (current >= this.maxPerIp) return false;
    this.counts.set(ip, current + 1);
    return true;
  }

  release(ip: string): void {
    const current = this.counts.get(ip) ?? 0;
    if (current <= 1) this.counts.delete(ip);
    else this.counts.set(ip, current - 1);
  }

  count(ip: string): number {
    return this.counts.get(ip) ?? 0;
  }
}

/** IP do handshake pela mesma fonte dos limites HTTP (Pages, borda ou TRUST_PROXY). */
export function socketRequestIp(request: IncomingMessage): string {
  return clientIp({
    headers: request.headers,
    ip: forwardedClientIp(
      request.socket?.remoteAddress,
      request.headers['x-forwarded-for'],
    ),
  });
}

function isHandshake(request: IncomingMessage): boolean {
  const query = (request.url ?? '').split('?')[1] ?? '';
  return !new URLSearchParams(query).has('sid');
}

interface EngineSocket {
  request: IncomingMessage;
  once(event: 'close', listener: () => void): void;
}

export interface SocketIoAdapterOptions {
  maxConnectionsPerIp?: number;
}

export class SocketIoAdapter extends IoAdapter {
  private readonly limiter: ConnectionLimiter;

  constructor(
    appContext: INestApplicationContext | object,
    options: SocketIoAdapterOptions = {},
  ) {
    super(appContext);
    this.limiter = new ConnectionLimiter(
      options.maxConnectionsPerIp ?? maxConnectionsPerIpFromEnv(),
    );
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const allowedOrigins = getAllowedOrigins();
    const allowLocalDev = isDevEnvironment();
    const reserved = new WeakMap<IncomingMessage, string>();

    const isOriginAllowed = (origin: string | undefined): boolean => {
      if (allowLocalDev && isLocalOrigin(origin)) {
        return true;
      }
      return isAllowedOrigin(origin, allowedOrigins);
    };

    const server = super.createIOServer(port, {
      ...options,
      maxHttpBufferSize: WS_MAX_HTTP_BUFFER_SIZE,
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
      allowRequest: (
        request: IncomingMessage,
        callback: (err: string | null | undefined, success: boolean) => void,
      ) => {
        if (!isOriginAllowed(request.headers.origin)) {
          callback(null, false);
          return;
        }
        if (!isHandshake(request)) {
          callback(null, true);
          return;
        }
        const ip = socketRequestIp(request);
        if (!this.limiter.tryAcquire(ip)) {
          callback('Muitas conexões simultâneas', false);
          return;
        }
        reserved.set(request, ip);
        callback(null, true);
      },
    }) as Server;

    server.engine.on('connection', (socket: EngineSocket) => {
      const ip = reserved.get(socket.request);
      if (ip === undefined) return;
      reserved.delete(socket.request);
      socket.once('close', () => this.limiter.release(ip));
    });
    server.engine.on('connection_error', (error: { req?: IncomingMessage }) => {
      const ip = error.req ? reserved.get(error.req) : undefined;
      if (ip === undefined || !error.req) return;
      reserved.delete(error.req);
      this.limiter.release(ip);
    });
    return server;
  }
}
