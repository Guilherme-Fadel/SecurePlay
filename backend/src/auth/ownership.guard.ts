import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tokenUserId = request.user?.userId;

    const resourceUserId =
      request.body?.usuario_id ??
      request.params?.usuario_id;

    if (!tokenUserId || !resourceUserId) {
      throw new ForbiddenException('Acesso negado');
    }

    if (tokenUserId !== Number(resourceUserId)) {
      throw new ForbiddenException('Acesso negado');
    }

    return true;
  }
}
