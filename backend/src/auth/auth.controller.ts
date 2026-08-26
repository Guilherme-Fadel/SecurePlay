import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Request,
  Response,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from 'src/usuario/dto/login.dto';
import { UsuarioService } from 'src/usuario/usuario.service';
import { Public } from './public.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async signIn(
    @Body() dto: LoginDto,
    @Response({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.signIn(dto);

    res.setCookie('token', result.token, this.authService.cookieOptions);

    return {
      message: result.message,
      nome: result.nome,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @Request() req: any,
    @Response({ passthrough: true }) res: any,
  ) {
    const token = req.cookies?.token;
    const result = await this.authService.signOut(token);

    res.clearCookie('token', { path: '/' });

    return result;
  }

  @Get('token')
  async me(@Request() req: any) {
    return this.usuarioService.getUsuarioDados(req.user.userId);
  }
}
