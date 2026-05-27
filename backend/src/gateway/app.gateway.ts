import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transports: ['websocket', 'polling'],
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('AppGateway');

  private userSockets = new Map<number, Set<string>>();

  handleConnection(client: Socket) {
    const userId = Number(client.handshake.query.userId);

    if (!userId || isNaN(userId)) {
      this.logger.warn(`Conexão rejeitada - userId inválido: ${client.handshake.query.userId}`);
      client.disconnect();
      return;
    }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    this.logger.log(`Usuário ${userId} conectado (socket: ${client.id})`);
  }

  handleDisconnect(client: Socket) {
    const userId = Number(client.handshake.query.userId);

    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId)!;
      sockets.delete(client.id);

      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

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
    const socketIds = this.userSockets.get(payload.usuario_id);

    if (socketIds && socketIds.size > 0) {
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit('new-notification', payload);
      });

      this.logger.log(`Notificação enviada para usuário ${payload.usuario_id}`);
    }
  }
}
