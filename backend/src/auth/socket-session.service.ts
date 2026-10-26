import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuarioService } from '../usuario/usuario.service';
import { RedisService } from '../redis/redis.service';
import {
  activeAccountSession,
  sessionTokenHash,
  SocketSession,
} from './session';

@Injectable()
export class SocketSessionService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsuarioService,
    private readonly redis: RedisService,
  ) {}

  async authenticate(token: string): Promise<SocketSession> {
    const payload = await this.jwt.verifyAsync<{
      sub: number;
      sessionVersion?: number;
      exp: number;
    }>(token);
    if (
      !Number.isSafeInteger(payload.sub) ||
      payload.sub <= 0 ||
      !Number.isSafeInteger(payload.exp)
    )
      throw new UnauthorizedException('Sessão inválida');
    const session: SocketSession = {
      userId: payload.sub,
      sessionVersion: payload.sessionVersion ?? 0,
      tokenHash: sessionTokenHash(token),
      expiresAt: payload.exp * 1000,
      trialExpiresAt: null,
    };
    if (await this.redis.get(`blacklist:${token}`))
      throw new UnauthorizedException('Sessão inválida');
    const current = await this.validate(session);
    if (!current) throw new UnauthorizedException('Sessão inválida');
    return current;
  }

  async validate(session: SocketSession): Promise<SocketSession | null> {
    if (Date.now() >= session.expiresAt) return null;
    const [user, revoked] = await Promise.all([
      this.users.getUsuarioById(session.userId),
      this.redis.get(`session-revoked:${session.tokenHash}`),
    ]);
    if (revoked || !activeAccountSession(user, session.sessionVersion))
      return null;
    const trialExpiresAt = user.trial_ends_at
      ? new Date(user.trial_ends_at).getTime()
      : null;
    if (
      Date.now() >= session.expiresAt ||
      (trialExpiresAt !== null && Date.now() >= trialExpiresAt)
    )
      return null;
    return { ...session, trialExpiresAt };
  }
}
