import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '../auth/roles.enum';

const PAPEIS: Record<'user' | 'teacher' | 'admin', Role> = {
  user: Role.USER,
  teacher: Role.TEACHER,
  admin: Role.ADMIN,
};

/**
 * Papel do convite. O admin da escola convida aluno ou professor; só a plataforma
 * convida administrador. `administrador` é o campo legado e continua valendo.
 */
export function papelDoConvite(
  dto: { papel?: 'user' | 'teacher' | 'admin'; administrador?: boolean },
  plataforma: boolean,
): Role {
  if (!plataforma) {
    if (dto.papel === 'admin')
      throw new ForbiddenException(
        'Somente a plataforma emite convite de administrador',
      );
    return dto.papel ? PAPEIS[dto.papel] : Role.USER;
  }
  if (dto.papel && dto.administrador && dto.papel !== 'admin')
    throw new BadRequestException(
      'O papel do convite não confere com o campo administrador',
    );
  if (dto.papel) return PAPEIS[dto.papel];
  return dto.administrador ? Role.ADMIN : Role.USER;
}
