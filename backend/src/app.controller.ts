import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/auth.guard';
import type { FastifyRequest } from 'fastify';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  health() {
    return {message: 'Server is Running'};
  }

  @UseGuards(JwtAuthGuard)
  @Get('home')
  home(@Req() req: FastifyRequest) {
    return {
      message: 'Acesso autorizado',
      user: (req as any).user,
    };
  }

}
