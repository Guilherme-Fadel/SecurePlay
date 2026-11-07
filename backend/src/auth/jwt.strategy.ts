import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsuarioService } from '../usuario/usuario.service';
import { Usuario } from '../usuario/usuario.entity';
import { extractRequestToken } from '../common/utils/token.utils';
import { activeAccountSession } from './session';

function extractFromCookieOrHeader(req: Request): string | null {
  return extractRequestToken(req);
}

/**
 * Cache curto da conta já validada, por processo. Cada requisição autenticada
 * consultava o usuário no banco (≈ 1 ida e volta de rede). Com o TTL, uma
 * desativação, troca de senha ou logout em outra sessão pode levar até esse
 * tempo para valer neste processo. A revogação do token (Redis) continua
 * imediata. `AUTH_USER_CACHE_TTL_MS=0` desliga o cache.
 */
const USER_CACHE_MAX_ENTRIES = 5000;
function userCacheTtlMs(): number {
  const raw = Number(process.env.AUTH_USER_CACHE_TTL_MS ?? 2000);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 10_000) : 0;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly accountCache = new Map<
    number,
    { expiresAt: number; usuario: Usuario }
  >();

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
    const ttl = userCacheTtlMs();
    const cached = ttl ? this.accountCache.get(payload.sub) : undefined;
    const sessionVersion = payload.sessionVersion ?? 0;
    let usuario: Usuario | undefined =
      cached && cached.expiresAt > Date.now() ? cached.usuario : undefined;
    if (!usuario || !activeAccountSession(usuario, sessionVersion)) {
      this.accountCache.delete(payload.sub);
      usuario = await this.usuarioService.getUsuarioById(payload.sub);
      if (!activeAccountSession(usuario, sessionVersion)) {
        throw new UnauthorizedException('Ocorreu um erro inesperado');
      }
      if (ttl) {
        if (this.accountCache.size >= USER_CACHE_MAX_ENTRIES)
          this.accountCache.clear();
        this.accountCache.set(payload.sub, {
          expiresAt: Date.now() + ttl,
          usuario,
        });
      }
    }
    return {
      userId: usuario.id,
      email: usuario.email,
      role: usuario.role,
      sessionVersion,
    };
  }
}
