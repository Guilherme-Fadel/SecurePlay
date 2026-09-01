import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, Matches } from 'class-validator';
import { Public } from '../auth/public.decorator';
import { CompleteCadastroConviteDto } from './dto/complete-cadastro-convite.dto';
import { ConvitesService } from './convites.service';

class TokenConviteDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: 'Token de convite inválido.' })
  token: string;
}

class CadastroConviteDto extends CompleteCadastroConviteDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: 'Token de convite inválido.' })
  token: string;
}

@Controller('convites')
export class ConvitesController {
  constructor(private readonly convitesService: ConvitesService) {}

  @Public()
  @Post('consultar')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  consultar(@Body() dto: TokenConviteDto) {
    return this.convitesService.consultarPublico(dto.token);
  }

  @Public()
  @Post('cadastro')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  completar(@Body() dto: CadastroConviteDto) {
    return this.convitesService.completarCadastro(dto.token, dto);
  }
}
