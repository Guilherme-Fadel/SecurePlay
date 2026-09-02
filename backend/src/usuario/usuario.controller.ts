import { Body, Controller, Patch, Post, Request } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { RequestNicknameDto } from './dto/request-nickname.dto';
import {
  PresignProfileImageDto,
  SaveProfileImageDto,
} from './dto/profile-image.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Patch('perfil/apelido')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  requestNickname(@Request() req: any, @Body() dto: RequestNicknameDto) {
    return this.usuarioService.requestNickname(req.user.userId, dto.nickname);
  }

  @Post('perfil/foto/presign')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  presignProfileImage(
    @Request() req: any,
    @Body() dto: PresignProfileImageDto,
  ) {
    return this.usuarioService.presignProfileImage(
      req.user.userId,
      dto.contentType,
    );
  }

  @Patch('perfil/foto')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  saveProfileImage(@Request() req: any, @Body() dto: SaveProfileImageDto) {
    return this.usuarioService.saveProfileImage(req.user.userId, dto.key);
  }
}
