import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  getAllowedOrigins,
  isAllowedOrigin,
  isDevEnvironment,
  isLocalOrigin,
} from '../config/origins';
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

    const request = context
      .switchToHttp()
      .getRequest<{ method: string; headers: { origin?: string } }>();
    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const origin = request.headers.origin;
    // Rota pública sem Origin segue liberada para clientes fora do navegador; com Origin,
    // um site de terceiros não pode disparar login, cadastro ou e-mail em nome do visitante.
    if (isPublic && !origin) {
      return true;
    }
    if (!this.isAllowed(origin)) {
      throw new ForbiddenException('Origem da solicitação não permitida');
    }

    return true;
  }

  private isAllowed(origin: string | undefined): boolean {
    return (
      isAllowedOrigin(origin, getAllowedOrigins()) ||
      (isDevEnvironment() && isLocalOrigin(origin))
    );
  }
}
