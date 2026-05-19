import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OwnerFieldOptions } from './owner-field.decorator';
import { Role } from './roles.enum';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Acesso negado');
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    if (!Object.values(Role).includes(user.role)) {
      throw new ForbiddenException('Acesso negado');
    }

    const ownerField = this.reflector.get<OwnerFieldOptions>(
      'ownerField',
      context.getHandler(),
    );

    if (!ownerField) {
      throw new ForbiddenException('OwnerField decorator não configurado na rota');
    }

    const resourceUserId = request[ownerField.source]?.[ownerField.field];

    if (!user.userId || !resourceUserId) {
      throw new ForbiddenException('Acesso negado');
    }

    if (user.userId !== Number(resourceUserId)) {
      throw new ForbiddenException('Acesso negado');
    }

    return true;
  }
}
