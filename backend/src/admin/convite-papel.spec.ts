import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Role } from '../auth/roles.enum';
import { CreateConviteDto } from './dto/create-convite.dto';
import { papelDoConvite } from './convite-papel';

const TEACHER = 'teacher' as Role;

describe('papelDoConvite', () => {
  it('admin da escola convida aluno ou professor', () => {
    expect(papelDoConvite({}, false)).toBe(Role.USER);
    expect(papelDoConvite({ papel: 'user' }, false)).toBe(Role.USER);
    expect(papelDoConvite({ papel: 'teacher' }, false)).toBe(TEACHER);
  });

  it('admin da escola não emite convite de administrador', () => {
    expect(() => papelDoConvite({ papel: 'admin' }, false)).toThrow(
      new ForbiddenException(
        'Somente a plataforma emite convite de administrador',
      ),
    );
  });

  it('admin da escola mantém o comportamento atual do campo administrador', () => {
    expect(papelDoConvite({ administrador: true }, false)).toBe(Role.USER);
  });

  it('plataforma emite qualquer papel e mantém o campo administrador', () => {
    expect(papelDoConvite({ administrador: true }, true)).toBe(Role.ADMIN);
    expect(papelDoConvite({ papel: 'admin', administrador: true }, true)).toBe(
      Role.ADMIN,
    );
    expect(papelDoConvite({ papel: 'teacher' }, true)).toBe(TEACHER);
    expect(papelDoConvite({}, true)).toBe(Role.USER);
  });

  it('plataforma recusa papel divergente do campo administrador', () => {
    expect(() =>
      papelDoConvite({ papel: 'teacher', administrador: true }, true),
    ).toThrow(
      new BadRequestException(
        'O papel do convite não confere com o campo administrador',
      ),
    );
  });

  it('DTO aceita papel e turma e recusa valores fora do contrato', () => {
    const erros = (body: object) =>
      validateSync(plainToInstance(CreateConviteDto, body)).map(
        (e) => e.property,
      );
    expect(erros({ papel: 'teacher', email: 'p@example.test' })).toEqual([]);
    expect(erros({ turma_id: '4' })).toEqual([]);
    expect(erros({ papel: 'platform_admin' })).toEqual(['papel']);
    expect(erros({ turma_id: 0 })).toEqual(['turma_id']);
  });
});
