import { Controller, Get, Post, Body, UseGuards, Query, Delete, Param, Patch, Request, ForbiddenException } from "@nestjs/common";
import { ResultadoDto } from "src/resultado.dto";
import { JwtAuthGuard } from "src/auth/auth.guard";
import { NotificationService } from "./notification.service";
import { CreateNotificationDto } from "./dto/notification.dto";

@Controller('notification')
@UseGuards(JwtAuthGuard)
export class NotificationController{
  constructor(private readonly notificationService: NotificationService){}

  @Post('criar')
  async criarNotification(@Body() data: CreateNotificationDto): Promise<ResultadoDto> {
    return this.notificationService.insertNotification(data)
  }

  @Get('buscar')
  async buscarNotification(@Query('id') id: string, @Request() req: any): Promise<CreateNotificationDto[]> {
    const usuarioId = Number(id);

    if (!id || isNaN(usuarioId)) {
      throw new ForbiddenException('ID do usuário é obrigatório');
    }

    if (req.user.userId !== usuarioId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.notificationService.getNotification(usuarioId);
  }

  @Delete('deletar/:id')
  async deletarNotification(@Param('id') id: string, @Request() req: any): Promise<ResultadoDto>{
    return this.notificationService.deleteNotification(Number(id), req.user.userId);
  }

  @Patch('ler/:id')
  async lerNotification(@Param('id') id: string, @Request() req: any): Promise<ResultadoDto>{
    return this.notificationService.markAsRead(Number(id), req.user.userId);
  }

  @Patch('ler-todas/:usuario_id')
  async lerTodasNotification(@Param('usuario_id') usuario_id: string, @Request() req: any): Promise<ResultadoDto>{
    const usuarioId = Number(usuario_id);

    if (req.user.userId !== usuarioId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.notificationService.markAllAsRead(usuarioId);
  }

}