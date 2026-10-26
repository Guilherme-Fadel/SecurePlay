import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
  Request,
  Response,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../usuario/dto/login.dto';
import { UsuarioService } from '../usuario/usuario.service';
import { Public } from './public.decorator';
import { Throttle } from '@nestjs/throttler';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AllowExpiredTrial } from '../registration/trial-access.guard';
import { extractRequestToken } from '../common/utils/token.utils';
import type { AuthenticatedRequest } from './session';
import type { FastifyReply } from 'fastify';

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
    @Response({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.signIn(dto);

    if (result.requiresEmailVerification || result.requiresPasswordSetup) {
      return result;
    }

    if (!result.token || !result.userId) throw new Error('Sessão não emitida');
    res.setCookie('token', result.token, this.authService.cookieOptions);
    res.header('Cache-Control', 'private, no-store');

    const user = await this.usuarioService.getUsuarioDados(result.userId);

    return {
      message: result.message,
      nome: result.nome,
      user,
    };
  }

  @Post('logout')
  @AllowExpiredTrial()
  @HttpCode(HttpStatus.OK)
  async signOut(
    @Request() req: AuthenticatedRequest,
    @Response({ passthrough: true }) res: FastifyReply,
  ) {
    const token = extractRequestToken(req);
    const result = await this.authService.signOut(token ?? undefined);

    res.clearCookie('token', this.authService.cookieClearOptions);

    return result;
  }

  @Get(['me', 'token'])
  @AllowExpiredTrial()
  async me(
    @Request() req: AuthenticatedRequest,
    @Response({ passthrough: true }) res: FastifyReply,
  ) {
    res.header('Cache-Control', 'private, no-store');
    return this.usuarioService.getUsuarioDados(req.user.userId);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
    @Response({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.changePassword(
      req.user.userId,
      dto,
      req.user.sessionVersion,
    );
    res.header('Cache-Control', 'private, no-store');
    res.setCookie('token', result.token, this.authService.cookieOptions);
    return {
      message: result.message,
      ...(!req.cookies?.token ? { token: result.token } : {}),
    };
  }
}
