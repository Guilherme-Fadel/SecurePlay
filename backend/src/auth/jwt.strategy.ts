import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsuarioService } from '../usuario/usuario.service';
import { extractRequestToken } from '../common/utils/token.utils';
import { activeAccountSession } from './session';

function extractFromCookieOrHeader(req: Request): string | null {
  return extractRequestToken(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usuarioService: UsuarioService) {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET deve estar definido e ter ao menos 32 caracteres',
      );
    }

    super({
      jwtFromRequest: extractFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: {
    sub: number;
    sessionVersion?: number;
    exp?: number;
  }) {
    if (
      !Number.isSafeInteger(payload.sub) ||
      payload.sub <= 0 ||
      !Number.isSafeInteger(payload.exp) ||
      (payload.exp ?? 0) <= Date.now() / 1000
    )
      throw new UnauthorizedException('Sessão inválida');
    const usuario = await this.usuarioService.getUsuarioById(payload.sub);
    const sessionVersion = payload.sessionVersion ?? 0;
    if (!activeAccountSession(usuario, sessionVersion)) {
      throw new UnauthorizedException('Ocorreu um erro inesperado');
    }
    return {
      userId: usuario.id,
      email: usuario.email,
      role: usuario.role,
      sessionVersion,
    };
  }
}
