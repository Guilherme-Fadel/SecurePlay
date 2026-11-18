import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import {
  CreateNotificationDto,
  NotificationResponseDto,
} from './dto/notification.dto';
import { ResultadoDto } from 'src/resultado.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsuarioService } from '../usuario/usuario.service';
import { Role } from '../auth/roles.enum';
import {
  NotificationType,
  sanitizeNotificationLink,
} from './notification-types';
import { gravarAgrupadas, ModoGravacao } from './notification-sql';

export interface NotificationInput {
  usuarioId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  groupKey?: string | null;
  /** `resumo`: texto começa com contagem; só reabre quando ela aumenta. */
  mode?: ModoGravacao;
}

const LOTE_NOTIFICACOES = 500;
const LIMITE_LISTAGEM = 50;
const DIAS_PROTECAO_SEGURANCA = 30;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

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
    // `readed` nunca vem do cliente: toda notificação nasce não lida.
    const notification = await this.notificationRepository.save({
      usuario_id: data.usuario_id,
      title: data.title,
      message: data.message,
      type: data.type ?? 'aviso',
      link: sanitizeNotificationLink(data.link),
      readed: false,
    });

    this.eventEmitter.emit('notification.created', {
      id: notification.id,
      usuario_id: notification.usuario_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      link: notification.link ?? null,
      created_at: notification.created_at,
    });

    return {
      sucesso: true,
      mensagem: 'Inclusão de registro realizada com sucesso',
    };
  }

  /**
   * Grava notificações geradas pelo sistema e as publica no socket.
   * Sem `groupKey`: insere sempre. Com `groupKey`: `once` (padrão) ignora se já
   * existir para o usuário; `replace` atualiza texto, zera a leitura e renova a data;
   * `resumo` só reabre quando a contagem no início do texto aumenta. Grupos vão
   * em consultas multi-linha. Retorna quantas linhas foram publicadas (novas ou reabertas).
   */
  async notify(inputs: NotificationInput[]): Promise<number> {
    let total = 0;
    for (let i = 0; i < inputs.length; i += LOTE_NOTIFICACOES) {
      const lote = inputs.slice(i, i + LOTE_NOTIFICACOES).map((input) => ({
        usuarioId: input.usuarioId,
        type: input.type,
        title: String(input.title ?? '').slice(0, 100),
        message: String(input.message ?? '').slice(0, 250),
        link: sanitizeNotificationLink(input.link),
        groupKey: input.groupKey ? input.groupKey.slice(0, 120) : null,
        mode: input.mode ?? 'once',
      }));
      const ids: number[] = [];

      const semGrupo = lote.filter((item) => !item.groupKey);
      if (semGrupo.length) {
        const salvas = await this.notificationRepository.save(
          semGrupo.map((item) => ({
            usuario_id: item.usuarioId,
            title: item.title,
            message: item.message,
            type: item.type,
            link: item.link,
            readed: false,
          })),
        );
        for (const salva of salvas) ids.push(salva.id);
      }

      const comGrupo = lote.filter((entry) => entry.groupKey);
      if (comGrupo.length) {
        ids.push(
          ...(await gravarAgrupadas(this.notificationRepository, comGrupo)),
        );
      }

      total += ids.length;
      await this.publicar(ids);
    }
    return total;
  }

  private async publicar(ids: number[]): Promise<void> {
    if (!ids.length) return;
    try {
      const linhas = await this.notificationRepository.find({
        where: { id: In(ids) },
      });
      for (const linha of linhas) {
        this.eventEmitter.emit('notification.created', {
          id: linha.id,
          usuario_id: linha.usuario_id,
          title: linha.title,
          message: linha.message,
          type: linha.type,
          link: linha.link ?? null,
          created_at: linha.created_at,
        });
      }
    } catch {
      // A gravação já foi feita; o sino atualiza na próxima consulta.
      this.logger.warn('Falha ao publicar notificações no socket');
    }
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

    if (notification.type === 'seguranca') {
      const idade = Date.now() - new Date(notification.created_at).getTime();
      if (idade < DIAS_PROTECAO_SEGURANCA * 24 * 60 * 60 * 1000) {
        throw new BadRequestException(
          'Avisos de segurança não podem ser apagados nos primeiros 30 dias',
        );
      }
    }

    await this.notificationRepository.delete(id);

    return {
      sucesso: true,
      mensagem: 'Exclusão de registro realizada com sucesso',
    };
  }

  async getNotification(
    usuario_id?: number,
  ): Promise<NotificationResponseDto[]> {
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
        link: item.link ?? null,
        readed: item.readed,
        created_at: item.created_at,
      }));
    }

    const data = await this.notificationRepository.find({
      order: { created_at: 'DESC', id: 'DESC' },
      take: LIMITE_LISTAGEM,
    });

    return data.map((item) => ({
      id: item.id,
      usuario_id: item.usuario_id,
      title: item.title,
      message: item.message,
      type: item.type,
      link: item.link ?? null,
      readed: item.readed,
      created_at: item.created_at,
    }));
  }

  async getNotificationForActor(
    usuario_id: number,
    requestingUserId: number,
  ): Promise<NotificationResponseDto[]> {
    await this.ensureCanAccessUser(requestingUserId, usuario_id);
    return this.getNotification(usuario_id);
  }

  async getNotificationByUserId(usuario_id: number): Promise<Notification[]> {
    const result = await this.notificationRepository.find({
      where: { usuario_id },
      order: { created_at: 'DESC', id: 'DESC' },
      take: LIMITE_LISTAGEM,
    });
    return result ?? undefined;
  }

  private async ensureCanAccessUser(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<void> {
    if (requestingUserId === targetUserId) return;

    // Autoriza o papel antes de consultar o alvo, para não revelar por
    // 404/403 se um ID existe.
    const requestingUser =
      await this.usuarioService.getUsuarioById(requestingUserId);
    if (!requestingUser) {
      throw new ForbiddenException('Solicitante não encontrado');
    }
    if (
      requestingUser.role !== Role.ADMIN &&
      requestingUser.role !== Role.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException('Acesso negado para este usuário');
    }

    const targetUser = await this.usuarioService.getUsuarioById(targetUserId);

    if (requestingUser.role === Role.PLATFORM_ADMIN) {
      if (!targetUser) throw new NotFoundException('Usuário não encontrado');
      return;
    }

    // Admin: alvo inexistente e alvo de outra escola recebem a mesma resposta.
    const sameCompany =
      !!targetUser &&
      !!requestingUser.empresa_id &&
      requestingUser.empresa_id === targetUser.empresa_id;

    if (!sameCompany) {
      throw new ForbiddenException('Acesso negado para este usuário');
    }
  }
}
