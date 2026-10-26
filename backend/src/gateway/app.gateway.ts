import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  getAllowedOrigins,
  isAllowedOrigin,
  isDevEnvironment,
  isLocalOrigin,
} from '../config/origins';
import type { IncomingMessage } from 'http';
import { SocketSessionService } from '../auth/socket-session.service';
import type { SocketSession } from '../auth/session';

interface Connection {
  client: Socket;
  session: SocketSession;
  deadline?: ReturnType<typeof setTimeout>;
  checking?: Promise<boolean>;
  useTail: Promise<void>;
  pendingUses: number;
}

@WebSocketGateway({
  cors: { origin: getAllowedOrigins(), credentials: true },
  allowRequest: (
    request: IncomingMessage,
    done: (error: string | null, allowed: boolean) => void,
  ) => {
    const origin = request.headers.origin;
    done(
      null,
      isAllowedOrigin(origin) || (isDevEnvironment() && isLocalOrigin(origin)),
    );
  },
  transports: ['websocket', 'polling'],
})
export class AppGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('AppGateway');
  private readonly connections = new Map<string, Connection>();
  private timer?: ReturnType<typeof setInterval>;
  private scanning = false;

  constructor(private readonly sessions: SocketSessionService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.revalidateConnections(), 15_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    for (const entry of this.connections.values()) this.close(entry);
  }

  async handleConnection(client: Socket): Promise<void> {
    client.use((_packet, next) => {
      const entry = this.connections.get(client.id);
      if (!entry) {
        client.disconnect(true);
        next(new Error('Sessão inválida'));
        return;
      }
      void this.freshValidation(entry)
        .then((valid) => {
          if (valid) next();
          else next(new Error('Sessão inválida'));
        })
        .catch(() => {
          this.close(entry);
          next(new Error('Sessão inválida'));
        });
    });
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('Sessão ausente');
      const session = await this.sessions.authenticate(token);
      if (!client.connected) return;
      const entry: Connection = {
        client,
        session,
        useTail: Promise.resolve(),
        pendingUses: 0,
      };
      this.connections.set(client.id, entry);
      // Apenas metadados não secretos; nunca guarda JWT bruto no socket.
      Object.assign(client.data, session);
      await client.join([
        `user_${session.userId}`,
        `session_${session.tokenHash}`,
      ]);
      // Cobre revogação que ocorreu enquanto o handshake aguardava o join.
      if (!(await this.validate(entry))) return;
      this.logger.log(
        `Usuário ${session.userId} conectado (socket: ${client.id})`,
      );
    } catch {
      const entry = this.connections.get(client.id);
      if (entry) this.close(entry);
      else client.disconnect(true);
      this.logger.warn(`Conexão rejeitada (socket: ${client.id})`);
    }
  }

  private extractToken(client: Socket): string | null {
    const cookie = client.handshake.headers.cookie
      ?.split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith('token='))
      ?.slice(6);
    return cookie ? decodeURIComponent(cookie) : null;
  }

  private close(entry: Connection) {
    if (entry.deadline) clearTimeout(entry.deadline);
    if (this.connections.get(entry.client.id) === entry)
      this.connections.delete(entry.client.id);
    entry.client.disconnect(true);
  }

  private armDeadline(entry: Connection) {
    if (entry.deadline) clearTimeout(entry.deadline);
    const deadline = Math.min(
      entry.session.expiresAt,
      entry.session.trialExpiresAt ?? Infinity,
    );
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      this.close(entry);
      return;
    }
    // Reavalia deadlines distantes em vez de ultrapassar o limite do setTimeout.
    entry.deadline = setTimeout(
      () => {
        if (Date.now() >= deadline) this.close(entry);
        else this.armDeadline(entry);
      },
      Math.min(remaining, 2_147_483_647),
    );
    entry.deadline.unref();
  }

  private validate(entry: Connection): Promise<boolean> {
    if (entry.checking) return entry.checking;
    entry.checking = this.check(entry);
    const cleanup = () => {
      entry.checking = undefined;
    };
    void entry.checking.then(cleanup, cleanup);
    return entry.checking;
  }

  private async check(entry: Connection): Promise<boolean> {
    if (
      !entry.client.connected ||
      this.connections.get(entry.client.id) !== entry
    )
      return false;
    try {
      const session = await this.sessions.validate(entry.session);
      if (
        !session ||
        !entry.client.connected ||
        this.connections.get(entry.client.id) !== entry
      ) {
        this.close(entry);
        return false;
      }
      entry.session = session;
      Object.assign(entry.client.data, session);
      this.armDeadline(entry);
      return this.connections.get(entry.client.id) === entry;
    } catch {
      this.close(entry);
      this.logger.warn(
        `Sessão indisponível na revalidação (socket: ${entry.client.id})`,
      );
      return false;
    }
  }

  /** Cada uso começa uma consulta nova; não reaproveita uma varredura pré-logout. */
  private freshValidation(entry: Connection): Promise<boolean> {
    if (entry.pendingUses >= 16) {
      this.close(entry);
      return Promise.resolve(false);
    }
    entry.pendingUses++;
    const validation = entry.useTail.then(() => this.check(entry));
    entry.useTail = validation.then(
      () => undefined,
      () => undefined,
    );
    return validation.finally(() => {
      entry.pendingUses--;
    });
  }

  async revalidateConnections(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    try {
      const entries = [...this.connections.values()];
      for (let offset = 0; offset < entries.length; offset += 10)
        await Promise.all(
          entries
            .slice(offset, offset + 10)
            .map((entry) => this.validate(entry)),
        );
    } finally {
      this.scanning = false;
    }
  }

  handleDisconnect(client: Socket) {
    const entry = this.connections.get(client.id);
    if (entry?.deadline) clearTimeout(entry.deadline);
    this.connections.delete(client.id);
  }

  @OnEvent('auth.session.revoked')
  handleSessionRevoked(payload: { tokenHash: string }) {
    for (const entry of this.connections.values())
      if (entry.session.tokenHash === payload.tokenHash) this.close(entry);
  }

  @OnEvent('auth.sessions.revoked')
  handleSessionsRevoked(payload: { userId: number; sessionVersion: number }) {
    for (const entry of this.connections.values())
      if (
        entry.session.userId === payload.userId &&
        entry.session.sessionVersion < payload.sessionVersion
      )
        this.close(entry);
  }

  @OnEvent('usuario.inativado')
  handleUserDeactivated(payload: { userId: number }) {
    this.server.in(`user_${payload.userId}`).disconnectSockets(true);
  }

  @OnEvent('notification.created')
  async handleNotificationCreated(payload: {
    usuario_id: number;
    id: number;
    title: string;
    message: string;
    type: string;
    created_at: Date;
  }): Promise<void> {
    // Não usa broadcast: cada sessão precisa continuar autorizada no envio.
    const targets = [...this.connections.values()].filter(
      (entry) => entry.session.userId === payload.usuario_id,
    );
    for (const entry of targets) {
      if (await this.freshValidation(entry))
        entry.client.emit('new-notification', payload);
    }
  }
}
