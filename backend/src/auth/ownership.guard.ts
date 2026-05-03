import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OwnerFieldOptions } from './owner-field.decorator';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tokenUserId = request.user?.userId;

    const ownerField = this.reflector.get<OwnerFieldOptions>(
      'ownerField',
      context.getHandler(),
    );

    if (!ownerField) {
      throw new ForbiddenException('OwnerField decorator não configurado na rota');
    }

    const resourceUserId = request[ownerField.source]?.[ownerField.field];

    if (!tokenUserId || !resourceUserId) {
      throw new ForbiddenException('Acesso negado');
    }

    if (tokenUserId !== Number(resourceUserId)) {
      throw new ForbiddenException('Acesso negado');
    }

    return true;
  }
}
