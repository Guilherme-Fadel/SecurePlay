import { Body, Controller, Get, Post, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from 'src/entities/usuarios/dto/login.dto';
import { UsuarioService } from 'src/entities/usuarios/usuario.service';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() dto: LoginDto) {
    return this.authService.signIn(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async signOut(@Request() req: any){
    return this.authService.signOut(req)
  }

  @Get('token')
  async me(@Request() req: any) {
    return this.usuarioService.getUsuarioDados(req.user.userId)
  }
}
