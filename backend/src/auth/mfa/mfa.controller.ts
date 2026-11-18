import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Response,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';
import { UsuarioService } from '../../usuario/usuario.service';
import { AuthService } from '../auth.service';
import { Public } from '../public.decorator';
import { MFA_CHALLENGE_COOKIE } from './mfa-challenge';
import { MfaVerifyDto } from './mfa-verify.dto';
import { MfaService } from './mfa.service';

type RequestWithCookies = { cookies?: Record<string, string | undefined> };

/**
 * Rotas públicas: quem chama ainda não tem sessão, só o desafio de MFA no cookie
 * `mfa_challenge` (nunca aceito como sessão).
 */
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfa: MfaService,
    private readonly authService: AuthService,
    private readonly usuarioService: UsuarioService,
  ) {}

  @Public()
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async setup(
    @Req() req: RequestWithCookies,
    @Response({ passthrough: true }) res: FastifyReply,
  ) {
    res.header('Cache-Control', 'private, no-store');
    const { secret, otpauthUrl, challenge } = await this.mfa.setup(
      req.cookies?.[MFA_CHALLENGE_COOKIE],
    );
    // Renova o desafio: o prazo do cadastro conta a partir da exibição do QR.
    res.setCookie(
      MFA_CHALLENGE_COOKIE,
      challenge.token,
      this.authService.challengeCookieOptions(challenge.ttlSeconds),
    );
    return { secret, otpauthUrl };
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async verify(
    @Req() req: RequestWithCookies,
    @Body() dto: MfaVerifyDto,
    @Response({ passthrough: true }) res: FastifyReply,
  ) {
    const { user, recoveryCodes } = await this.mfa.verify(
      req.cookies?.[MFA_CHALLENGE_COOKIE],
      dto,
    );
    res.setCookie(
      'token',
      this.authService.createSessionToken(user),
      this.authService.cookieOptions,
    );
    res.clearCookie(MFA_CHALLENGE_COOKIE, this.authService.cookieClearOptions);
    res.header('Cache-Control', 'private, no-store');
    return {
      message: 'Login realizado com sucesso',
      nome: user.name,
      user: await this.usuarioService.getUsuarioDados(user.id),
      ...(recoveryCodes ? { recoveryCodes } : {}),
    };
  }
}
