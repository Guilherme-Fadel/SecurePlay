import { Body, Controller, Get, Post, HttpCode, HttpStatus, Request, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from 'src/entities/usuarios/dto/login.dto';
import { JwtAuthGuard } from './auth.guard';
import { UsuarioService } from 'src/entities/usuarios/usuario.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() dto: LoginDto) {
    return this.authService.signIn(dto);
  }

  @Get('token')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: any) {
    return this.usuarioService.getUsuarioDados(req.user.userId)
  }
}