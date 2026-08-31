import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Role } from './roles.enum';
import { Request } from 'express';

function extractFromCookieOrHeader(req: Request): string | null {
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  const authHeader = req.headers?.authorization;
  if (authHeader) {
    const [type, token] = authHeader.split(' ');
    if (type === 'Bearer' && token) return token;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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

  async validate(payload: any) {
    const validRoles = Object.values(Role);
    if (!payload.role || !validRoles.includes(payload.role)) {
      throw new UnauthorizedException('Ocorreu um erro inesperado');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
