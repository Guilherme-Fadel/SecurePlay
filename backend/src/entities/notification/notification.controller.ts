import { Controller, Get, Post, Body, UseGuards, Query, Delete, Param, Patch } from "@nestjs/common";
import { ResultadoDto } from "src/resultado.dto";
import { JwtAuthGuard } from "src/auth/auth.guard";
import { NotificationService } from "./notification.service";
import { CreateNotificationDto } from "./dto/notification.dto";
import { Notification } from "./notification.entity";

@Controller('notification')
export class NotificationController{
  constructor(private readonly notificationService: NotificationService){}

  @Post('criar')
    @UseGuards(JwtAuthGuard)
    async criarNotification(@Body() data: CreateNotificationDto): Promise<ResultadoDto> {
      return this.notificationService.insertNotification(data)
    }
  
    @Get('buscar')
    async buscarNotification(@Query('id') id?: string): Promise<CreateNotificationDto[]> {
      return this.notificationService.getNotification(id ? Number(id) : undefined)
    }
  
    @Delete('deletar/:id')
    @UseGuards(JwtAuthGuard)
    async deletarNotification(@Param('id') id: number): Promise<ResultadoDto>{
      return this.notificationService.deleteNotification(id);
    }

    @Patch('ler/:id')
    @UseGuards(JwtAuthGuard)
    async lerNotification(@Param('id') id: string): Promise<ResultadoDto>{
      return this.notificationService.markAsRead(Number(id));
    }

    @Patch('ler-todas/:usuario_id')
    @UseGuards(JwtAuthGuard)
    async lerTodasNotification(@Param('usuario_id') usuario_id: string): Promise<ResultadoDto>{
      return this.notificationService.markAllAsRead(Number(usuario_id));
    }

}