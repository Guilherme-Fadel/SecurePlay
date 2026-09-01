import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from './auth/auth.guard';
import type { FastifyRequest } from 'fastify';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get(['', 'health'])
  health() {
    return { status: 'ok' };
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
