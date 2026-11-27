import { Body, Controller, Patch, Request } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { RequestNicknameDto } from './dto/request-nickname.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Patch('perfil/apelido')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  requestNickname(@Request() req: any, @Body() dto: RequestNicknameDto) {
    return this.usuarioService.requestNickname(req.user.userId, dto.nickname);
  }

  @Patch('perfil/boas-vindas/apelido')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  dismissNicknameOnboarding(@Request() req: { user: { userId: number } }) {
    return this.usuarioService.dismissNicknameOnboarding(req.user.userId);
  }
}
