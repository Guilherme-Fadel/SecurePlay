import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from '../redis/redis.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { extractRequestToken } from '../common/utils/token.utils';
import { sessionTokenHash } from './session';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private redisService: RedisService,
    private reflector: Reflector,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      cookies?: { token?: string };
      headers: { authorization?: string };
    }>();

    const cookieToken = request.cookies?.token;
    if (cookieToken && !request.headers['authorization']) {
      request.headers['authorization'] = `Bearer ${cookieToken}`;
    }

    await (super.canActivate(context) as Promise<boolean>);

    const token = extractRequestToken(request);

    if (!token) {
      throw new UnauthorizedException('Token não encontrado');
    }

    const isBlacklisted = (
      await this.redisService.mget([
        `session-revoked:${sessionTokenHash(token)}`,
        `blacklist:${token}`,
      ])
    ).some(Boolean);

    if (isBlacklisted) {
      throw new UnauthorizedException('Token inválido');
    }

    return true;
  }
}
