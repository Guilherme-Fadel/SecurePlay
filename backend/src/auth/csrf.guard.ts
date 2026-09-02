import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getAllowedOrigins, isAllowedOrigin } from '../config/origins';
import { IS_PUBLIC_KEY } from './public.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    if (!isAllowedOrigin(request.headers.origin, getAllowedOrigins())) {
      throw new ForbiddenException('Origem da solicitação não permitida');
    }

    return true;
  }
}
