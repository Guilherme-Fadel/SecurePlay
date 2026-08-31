import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { CreateNotificationDto } from './dto/notification.dto';
import { ResultadoDto } from 'src/resultado.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsuarioService } from '../usuario/usuario.service';
import { Role } from '../auth/roles.enum';

@Injectable()
export class NotificationService {
  constructor(
    @Inject('NOTIFICATION_REPOSITORY')
    private notificationRepository: Repository<Notification>,
    private eventEmitter: EventEmitter2,
    private readonly usuarioService: UsuarioService,
  ) {}

  async createForActor(
    data: CreateNotificationDto,
    requestingUserId: number,
  ): Promise<ResultadoDto> {
    await this.ensureCanAccessUser(requestingUserId, data.usuario_id);
    return this.insertNotification(data);
  }

  async insertNotification(data: CreateNotificationDto): Promise<ResultadoDto> {
    const notification = await this.notificationRepository.save(data);

    this.eventEmitter.emit('notification.created', {
      id: notification.id,
      usuario_id: notification.usuario_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      created_at: notification.created_at,
    });

    return {
      sucesso: true,
      mensagem: 'Inclusão de registro realizada com sucesso',
    };
  }

  async markAllAsRead(usuario_id: number): Promise<ResultadoDto> {
    await this.notificationRepository.update(
      { usuario_id, readed: false },
      { readed: true },
    );

    return {
      sucesso: true,
      mensagem: 'Todas as notificações marcadas como lidas',
    };
  }

  async markAllAsReadForActor(
    usuario_id: number,
    requestingUserId: number,
  ): Promise<ResultadoDto> {
    await this.ensureCanAccessUser(requestingUserId, usuario_id);
    return this.markAllAsRead(usuario_id);
  }

  async markAsRead(
    id: number,
    requestingUserId: number,
  ): Promise<ResultadoDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notification.usuario_id !== requestingUserId) {
      throw new ForbiddenException('Acesso negado');
    }

    await this.notificationRepository.update(id, { readed: true });

    return {
      sucesso: true,
      mensagem: 'Notificação marcada como lida',
    };
  }

  async deleteNotification(
    id: number,
    requestingUserId: number,
  ): Promise<ResultadoDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notification.usuario_id !== requestingUserId) {
      throw new ForbiddenException('Acesso negado');
    }

    await this.notificationRepository.delete(id);

    return {
      sucesso: true,
      mensagem: 'Exclusão de registro realizada com sucesso',
    };
  }

  async getNotification(usuario_id?: number): Promise<CreateNotificationDto[]> {
    if (usuario_id) {
      const result = await this.getNotificationByUserId(usuario_id);

      if (!result) {
        throw new NotFoundException('Usuário não possui notificações');
      }

      return result.map((item) => ({
        id: item.id,
        usuario_id: item.usuario_id,
        title: item.title,
        message: item.message,
        type: item.type,
        readed: item.readed,
        created_at: item.created_at,
      }));
    }

    const data = await this.notificationRepository.find();

    return data.map((item) => ({
      id: item.id,
      usuario_id: item.usuario_id,
      title: item.title,
      message: item.message,
      type: item.type,
      readed: item.readed,
      created_at: item.created_at,
    }));
  }

  async getNotificationForActor(
    usuario_id: number,
    requestingUserId: number,
  ): Promise<CreateNotificationDto[]> {
    await this.ensureCanAccessUser(requestingUserId, usuario_id);
    return this.getNotification(usuario_id);
  }

  async getNotificationByUserId(usuario_id: number): Promise<Notification[]> {
    const result = await this.notificationRepository.find({
      where: { usuario_id },
      order: { created_at: 'DESC' },
    });
    return result ?? undefined;
  }

  private async ensureCanAccessUser(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<void> {
    if (requestingUserId === targetUserId) return;

    const [requestingUser, targetUser] = await Promise.all([
      this.usuarioService.getUsuarioById(requestingUserId),
      this.usuarioService.getUsuarioById(targetUserId),
    ]);

    if (!requestingUser) {
      throw new ForbiddenException('Solicitante não encontrado');
    }
    if (!targetUser) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (requestingUser.role === Role.PLATFORM_ADMIN) return;

    const sameCompany =
      requestingUser.role === Role.ADMIN &&
      !!requestingUser.empresa_id &&
      requestingUser.empresa_id === targetUser.empresa_id;

    if (!sameCompany) {
      throw new ForbiddenException('Acesso negado para este usuário');
    }
  }
}
