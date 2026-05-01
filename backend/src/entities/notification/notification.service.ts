import { Injectable, Inject, NotFoundException, ForbiddenException } from "@nestjs/common";
import { Repository } from "typeorm";
import { Notification } from "./notification.entity";
import { CreateNotificationDto } from "./dto/notification.dto";
import { ResultadoDto } from "src/resultado.dto";


@Injectable()
export class NotificationService {

  constructor(
  @Inject('NOTIFICATION_REPOSITORY')
  private notificationRepository: Repository<Notification>
  ) { }

  async insertNotification(data: CreateNotificationDto): Promise<ResultadoDto> {

   await this.notificationRepository.save(data)

   return ({
        sucesso: true,
        mensagem: 'Inclusão de registro realizada com sucesso'
   });
  }

  async markAllAsRead(usuario_id: number): Promise<ResultadoDto> {
    await this.notificationRepository.update({ usuario_id, readed: false }, { readed: true });

    return {
      sucesso: true,
      mensagem: 'Todas as notificações marcadas como lidas'
    };
  }

  async markAsRead(id: number, requestingUserId: number): Promise<ResultadoDto> {
    const notification = await this.notificationRepository.findOne({ where: { id } });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notification.usuario_id !== requestingUserId) {
      throw new ForbiddenException('Acesso negado');
    }

    await this.notificationRepository.update(id, { readed: true });

    return {
      sucesso: true,
      mensagem: 'Notificação marcada como lida'
    };
  }

  async deleteNotification(id: number, requestingUserId: number): Promise<ResultadoDto> {
    const notification = await this.notificationRepository.findOne({ where: { id } });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notification.usuario_id !== requestingUserId) {
      throw new ForbiddenException('Acesso negado');
    }

    await this.notificationRepository.delete(id);

    return ({
        sucesso: true,
        mensagem: 'Exclusão de registro realizada com sucesso'
   });

  }

  async getNotification(usuario_id?: number): Promise<CreateNotificationDto[]>{

    if (usuario_id){        
        const result = await this.getNotificationByUserId(usuario_id)

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
          created_at: item.created_at
      }))
    
    }

    const data = await this.notificationRepository.find()

    return data.map((item) => ({
        id: item.id,
        usuario_id: item.usuario_id,
        title: item.title,
        message: item.message,
        type: item.type,
        readed: item.readed,
        created_at: item.created_at
    }))

  }

  async getNotificationByUserId(usuario_id: number): Promise<Notification[]> {
    const result = await this.notificationRepository.find({
      where: { usuario_id },
      order: { created_at: 'DESC' }
    })
    return result ?? undefined
  }

}