import { SetMetadata } from '@nestjs/common';
import { Role } from './roles.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => {
  if (roles.length === 0) {
    throw new Error('@Roles() requires at least one role');
  }
  return SetMetadata(ROLES_KEY, roles);
};
