import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { Role } from '../auth/roles.enum';
import { getAllowedOrigins } from '../config/origins';
import { Inject, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

@WebSocketGateway({
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('AppGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @Optional() @Inject('DATA_SOURCE') private readonly dataSource?: DataSource,
  ) {}

  async handleConnection(client: Socket) {
    const clientData = client.data as {
      userId?: number;
      trialTimer?: ReturnType<typeof setTimeout>;
    };
    const token = this.extractTokenFromCookie(client);

    if (!token) {
      this.logger.warn(`Conexão rejeitada sem JWT (socket: ${client.id})`);
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub?: number | string;
        role?: Role;
      }>(token);
      const userId = Number(payload.sub);
      const isBlacklisted = await this.redisService.get(`blacklist:${token}`);

      if (
        !Number.isInteger(userId) ||
        userId <= 0 ||
        !payload.role ||
        !Object.values(Role).includes(payload.role) ||
        isBlacklisted
      ) {
        throw new Error('JWT inválido');
      }

      if (this.dataSource) {
        const user = await this.dataSource
          .getRepository(Usuario)
          .findOne({ where: { id: userId } });
        if (
          !user ||
          (user.trial_ends_at && new Date(user.trial_ends_at) <= new Date())
        ) {
          throw new Error('Conta indisponível');
        }
        if (user.trial_ends_at) {
          clientData.trialTimer = setTimeout(
            () => client.disconnect(),
            Math.max(0, new Date(user.trial_ends_at).getTime() - Date.now()),
          );
        }
      }

      clientData.userId = userId;
      await client.join(`user_${userId}`);
    } catch {
      this.logger.warn(
        `Conexão rejeitada por JWT inválido (socket: ${client.id})`,
      );
      client.disconnect();
      return;
    }

    this.logger.log(
      `Usuário ${clientData.userId} conectado (socket: ${client.id})`,
    );
  }

  private extractTokenFromCookie(client: Socket): string | null {
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;

    const token = cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('token='))
      ?.slice('token='.length);

    return token ? decodeURIComponent(token) : null;
  }

  handleDisconnect(client: Socket) {
    const timer = (
      client.data as { trialTimer?: ReturnType<typeof setTimeout> }
    ).trialTimer;
    if (timer) clearTimeout(timer);
    this.logger.log(`Socket desconectado: ${client.id}`);
  }

  @OnEvent('notification.created')
  handleNotificationCreated(payload: {
    usuario_id: number;
    id: number;
    title: string;
    message: string;
    type: string;
    created_at: Date;
  }) {
    const room = `user_${payload.usuario_id}`;

    this.server.to(room).emit('new-notification', payload);
    this.logger.log(
      `Notificação enviada para room ${room} (usuário ${payload.usuario_id})`,
    );
  }
}
