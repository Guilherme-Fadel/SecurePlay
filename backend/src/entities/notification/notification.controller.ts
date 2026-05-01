import { Controller, Get, Post, Body, UseGuards, Query, Delete, Param } from "@nestjs/common";
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
    async buscarNotification(@Query('id') id?: number): Promise<CreateNotificationDto[]> {
      return this.notificationService.getNotification(id)
    }
  
    @Delete('deletar/:id')
    @UseGuards(JwtAuthGuard)
    async deletarNotification(@Param('id') id: number): Promise<ResultadoDto>{
      return this.notificationService.deleteNotification(id);
    }

}