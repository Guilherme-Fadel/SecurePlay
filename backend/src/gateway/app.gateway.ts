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

  handleConnection(client: Socket) {
    const userId = Number(client.handshake.query.userId);

    if (!userId || isNaN(userId)) {
      this.logger.warn(`Conexão rejeitada - userId inválido: ${client.handshake.query.userId}`);
      client.disconnect();
      return;
    }

    client.join(`user_${userId}`);
    this.logger.log(`Usuário ${userId} conectado (socket: ${client.id}, room: user_${userId})`);
  }

  handleDisconnect(client: Socket) {
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
    this.logger.log(`Notificação enviada para room ${room} (usuário ${payload.usuario_id})`);
  }
}
