import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { CompleteCadastroConviteDto } from './dto/complete-cadastro-convite.dto';
import { ConvitesService } from './convites.service';

@Controller('convites')
export class ConvitesController {
  constructor(private readonly convitesService: ConvitesService) {}

  @Public()
  @Get(':token')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  consultar(@Param('token') token: string) {
    return this.convitesService.consultarPublico(token);
  }

  @Public()
  @Post(':token/cadastro')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  completar(@Param('token') token: string, @Body() dto: CompleteCadastroConviteDto) {
    return this.convitesService.completarCadastro(token, dto);
  }
}
