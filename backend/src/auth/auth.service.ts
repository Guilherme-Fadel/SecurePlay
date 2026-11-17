import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioService } from '../usuario/usuario.service';
import { LoginDto } from '../usuario/dto/login.dto';
import { RedisService } from '../redis/redis.service';
import { calcTokenTtl } from '../common/utils/token.utils';
import { ConfigService } from '@nestjs/config';
import { RegistrationService } from '../registration/registration.service';
import { Role } from './roles.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChangePasswordDto } from './dto/change-password.dto';
import { sessionPayload, sessionTokenHash } from './session';
import { LoginAttemptsService, loginSubject } from './login-attempts.service';

/** Hash bcrypt (custo 10, igual ao das contas) de um texto aleatório descartado. */
export const TIMING_DUMMY_HASH =
  '$2b$10$Yi9abbrr2oaTtgs.vbaSpuh6hIz8DD4cGuGhNNhamxLz1hTJuOTVG';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly registrationService: RegistrationService,
    private readonly events: EventEmitter2,
    private readonly loginAttempts: LoginAttemptsService,
  ) {}

  get cookieOptions() {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const configuredSameSite = this.configService
      .get<string>('COOKIE_SAME_SITE')
      ?.trim()
      .toLowerCase();
    const sameSite =
      configuredSameSite === 'strict' ||
      configuredSameSite === 'lax' ||
      configuredSameSite === 'none'
        ? configuredSameSite
        : isProduction
          ? 'none'
          : 'lax';
    const domain = this.configService.get<string>('COOKIE_DOMAIN')?.trim();

    return {
      httpOnly: true,
      secure: isProduction || sameSite === 'none',
      sameSite,
      path: '/',
      maxAge: 2 * 60 * 60,
      ...(domain ? { domain } : {}),
    } as const;
  }

  get cookieClearOptions() {
    return { ...this.cookieOptions, maxAge: undefined };
  }

  /**
   * Confere identificador e senha com bloqueio por conta: durante o bloqueio,
   * nem a senha certa entra. Identificador sem conta segue a mesma regra.
   */
  private async verifyCredentials(identifier: string, password: string) {
    const user =
      await this.usuarioService.getUsuarioByLoginIdentifier(identifier);
    const attemptSubject = loginSubject(identifier, user?.id);
    await this.loginAttempts.assertNotLocked(attemptSubject);

    // Conta inexistente ou inativa também paga um bcrypt, para o tempo não revelar qual é o caso.
    const usable = !!user?.active;
    const matches = await bcrypt.compare(
      password,
      usable ? user.password : TIMING_DUMMY_HASH,
    );
    const valid = usable && matches;
    if (!user || !valid) {
      await this.loginAttempts.registerFailure(attemptSubject);
      throw new UnauthorizedException('Usuário ou senha inválidos');
    }
    await this.loginAttempts.reset(attemptSubject);
    return user;
  }

  async signIn(dto: LoginDto) {
    const identifier = dto.identifier ?? dto.email ?? '';
    const { password } = dto;

    if (!identifier || !password) {
      throw new UnauthorizedException('Identificador ou senha não fornecidos');
    }

    const user = await this.verifyCredentials(identifier, password);

    if (
      user.role === Role.PLATFORM_ADMIN &&
      user.email_verification_required &&
      !user.email_verified_at
    ) {
      await this.registrationService.startPlatformAdminVerification(user);
      return {
        requiresEmailVerification: true,
        email: user.email,
        message: 'Confira seu e-mail para confirmar o acesso administrativo.',
      };
    }

    if (user.password_change_required) {
      return {
        requiresPasswordSetup: true,
        email: user.email,
        message:
          'Defina sua senha pelo link enviado ao seu e-mail antes de entrar.',
      };
    }

    const token = this.jwtService.sign(sessionPayload(user));

    return {
      token,
      userId: user.id,
      nome: user.name,
      message: 'Login realizado com sucesso',
    };
  }

  async signOut(token: string | undefined) {
    if (!token) {
      return { message: 'Logout realizado com sucesso' };
    }

    const decoded = await this.jwtService.verifyAsync<{
      exp: number;
      sub?: number;
    }>(token);
    if (!Number.isSafeInteger(decoded.exp))
      throw new UnauthorizedException('Sessão inválida');
    const ttl = calcTokenTtl(decoded.exp);

    if (ttl > 0) {
      // Hash canônico primeiro; chave raw apenas para compatibilidade HTTP antiga.
      await this.redisService.eval(
        "redis.call('SET', KEYS[1], '1', 'EX', ARGV[1]); redis.call('SET', KEYS[2], '1', 'EX', ARGV[1]); return 1",
        [`session-revoked:${sessionTokenHash(token)}`, `blacklist:${token}`],
        [ttl],
      );
    }

    this.events.emit('auth.session.revoked', {
      tokenHash: sessionTokenHash(token),
    });
    await this.revokeEverywhereIfConfigured(decoded.sub);

    return { message: 'Logout realizado com sucesso' };
  }

  /**
   * D5: com LOGOUT_REVOKES_ALL_SESSIONS=true, o logout também incrementa session_version,
   * encerrando todas as sessões da conta. Assim a revogação vale mesmo se o Redis perder os
   * dados. Sem a variável, o logout encerra só a sessão atual (Redis), como antes.
   */
  private async revokeEverywhereIfConfigured(userId: number | undefined) {
    if (process.env.LOGOUT_REVOKES_ALL_SESSIONS?.trim() !== 'true') return;
    if (!Number.isSafeInteger(userId)) return;
    const sessionVersion = await this.usuarioService.revokeAllSessions(userId!);
    if (sessionVersion === null) return;
    this.events.emit('auth.sessions.revoked', { userId, sessionVersion });
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
    expectedVersion: number,
  ) {
    const user = await this.usuarioService.changePassword(
      userId,
      dto,
      expectedVersion,
    );
    this.events.emit('auth.sessions.revoked', {
      userId,
      sessionVersion: user.session_version,
    });
    return {
      token: this.jwtService.sign(sessionPayload(user)),
      message: 'Senha alterada com sucesso',
    };
  }
}
