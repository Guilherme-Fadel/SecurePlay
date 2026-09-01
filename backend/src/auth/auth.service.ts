import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioService } from 'src/usuario/usuario.service';
import { LoginDto } from 'src/usuario/dto/login.dto';
import { RedisService } from 'src/redis/redis.service';
import { calcTokenTtl } from 'src/common/utils/token.utils';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
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
    };
  }

  get cookieClearOptions() {
    const { maxAge: _maxAge, ...options } = this.cookieOptions;
    return options;
  }

  async signIn(dto: LoginDto) {
    const { email, password } = dto;

    if (!email || !password) {
      throw new UnauthorizedException('Email ou senha não fornecidos');
    }

    const user = await this.usuarioService.getUsuarioByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Usuário ou senha inválidos');
    }

    const senhaValida = await bcrypt.compare(password, user.password);

    if (!senhaValida) {
      throw new UnauthorizedException('Usuário ou senha inválidos');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

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

    const decoded = this.jwtService.decode(token);
    const ttl = calcTokenTtl(decoded.exp);

    if (ttl > 0) {
      await this.redisService.set(`blacklist:${token}`, '1', ttl);
    }

    return { message: 'Logout realizado com sucesso' };
  }
}
