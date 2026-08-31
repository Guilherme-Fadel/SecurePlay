import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Delete,
  Param,
  Patch,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ResultadoDto } from 'src/resultado.dto';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/notification.dto';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/roles.enum';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('criar')
  @Roles(Role.ADMIN, Role.PLATFORM_ADMIN)
  async criarNotification(
    @Body() data: CreateNotificationDto,
    @Request() req: any,
  ): Promise<ResultadoDto> {
    return this.notificationService.createForActor(data, req.user.userId);
  }

  @Get('buscar')
  async buscarNotification(
    @Query('id') id: string,
    @Request() req: any,
  ): Promise<CreateNotificationDto[]> {
    const usuarioId = Number(id);

    if (!id || isNaN(usuarioId)) {
      throw new ForbiddenException('ID do usuário é obrigatório');
    }

    return this.notificationService.getNotificationForActor(
      usuarioId,
      req.user.userId,
    );
  }

  @Delete('deletar/:id')
  async deletarNotification(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ResultadoDto> {
    return this.notificationService.deleteNotification(
      Number(id),
      req.user.userId,
    );
  }

  @Patch('ler/:id')
  async lerNotification(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ResultadoDto> {
    return this.notificationService.markAsRead(Number(id), req.user.userId);
  }

  @Patch('ler-todas/:usuario_id')
  async lerTodasNotification(
    @Param('usuario_id') usuario_id: string,
    @Request() req: any,
  ): Promise<ResultadoDto> {
    return this.notificationService.markAllAsReadForActor(
      Number(usuario_id),
      req.user.userId,
    );
  }
}
