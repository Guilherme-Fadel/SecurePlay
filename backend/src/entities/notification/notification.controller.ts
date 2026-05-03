import { Controller, Get, Post, Body, UseGuards, Query, Delete, Param, Patch, Request, ForbiddenException } from "@nestjs/common";
import { ResultadoDto } from "src/resultado.dto";
import { JwtAuthGuard } from "src/auth/auth.guard";
import { OwnershipGuard } from "src/auth/ownership.guard";
import { NotificationService } from "./notification.service";
import { CreateNotificationDto } from "./dto/notification.dto";

@Controller('notification')
@UseGuards(JwtAuthGuard)
export class NotificationController{
  constructor(private readonly notificationService: NotificationService){}

  @Post('criar')
  @UseGuards(OwnershipGuard)
  async criarNotification(@Body() data: CreateNotificationDto): Promise<ResultadoDto> {
    return this.notificationService.insertNotification(data)
  }

  @Get('buscar')
  @UseGuards(OwnershipGuard)
  async buscarNotification(@Query('id') id: string, @Request() req: any): Promise<CreateNotificationDto[]> {
    const usuarioId = Number(id);

    if (!id || isNaN(usuarioId)) {
      throw new ForbiddenException('ID do usuário é obrigatório');
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
  @UseGuards(OwnershipGuard)
  async lerTodasNotification(@Param('usuario_id') usuario_id: string): Promise<ResultadoDto>{
    return this.notificationService.markAllAsRead(Number(usuario_id));
  }

}
