import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConvitesService } from './convites.service';
import { Empresa } from '../empresa/empresa.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Role } from '../auth/roles.enum';
import { validateSync } from 'class-validator';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

describe('Administrative user editing', () => {
  it('preserva e-mail de conta confirmada/trial mesmo quando há username', async () => {
    const { service, manager } = setup(Role.PLATFORM_ADMIN, {
      username: 'aluno.teste',
      email: 'aluno@example.test',
      email_verified_at: new Date(),
      trial_started_at: new Date(),
    });
    await expect(
      service.atualizarUsuario(1, 2, { email: null }),
    ).rejects.toThrow('Este acesso exige um e-mail');
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('rejects invalid field types and platform role assignment', () => {
    expect(
      validateSync(
        Object.assign(new UpdateAdminUserDto(), {
          name: null,
          level: 1.5,
          role: 'platform_admin',
          email: 'invalid',
        }),
      )
        .map((error) => error.property)
        .sort(),
    ).toEqual(['email', 'level', 'name', 'role']);
    expect(
      validateSync(
        Object.assign(new UpdateAdminUserDto(), {
          nickname: null,
          email: null,
        }),
      ),
    ).toHaveLength(0);
  });
  function setup(role = Role.ADMIN, targetOverrides: Partial<Usuario> = {}) {
    const actor = {
      id: 1,
      role,
      active: true,
      empresa_id: role === Role.ADMIN ? 10 : null,
    };
    const target = {
      id: 2,
      empresa_id: 10,
      name: 'Aluno',
      email: 'aluno@example.com',
      nickname: null,
      role: Role.USER,
      active: true,
      level: 1,
      session_version: 1,
      password: 'private',
      ...targetOverrides,
    };
    const repository = { findOne: jest.fn().mockResolvedValue(actor) };
    const manager = {
      findOne: jest.fn(
        (
          entity: unknown,
          options: { where: { id: number; empresa_id?: number } },
        ) =>
          Promise.resolve(
            entity === Empresa
              ? { id: 10 }
              : options.where.id === target.id &&
                  (!options.where.empresa_id ||
                    options.where.empresa_id === target.empresa_id)
                ? target
                : null,
          ),
      ),
      count: jest.fn().mockResolvedValue(1),
      save: jest.fn((_entity: unknown, value: unknown) =>
        Promise.resolve(value),
      ),
    };
    const dataSource = {
      transaction: jest.fn(
        (work: (value: typeof manager) => Promise<unknown>) => work(manager),
      ),
    };
    const service = new ConvitesService(
      {} as never,
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      dataSource as never,
    );
    return { service, target, manager };
  }
  it('updates editable fields and audits field names without returning secrets', async () => {
    const { service, manager } = setup();
    const result = await service.atualizarUsuario(1, 2, {
      name: ' Novo nome ',
      email: 'novo@example.com',
      nickname: 'Novo apelido',
      level: 3,
    });
    expect(result).toMatchObject({
      name: 'Novo nome',
      email: 'novo@example.com',
      nickname: 'Novo apelido',
      level: 3,
    });
    expect(result).not.toHaveProperty('password');
    expect(manager.save).toHaveBeenCalledTimes(2);
    expect(
      (manager.save.mock.calls[1][1] as { detalhes: unknown }).detalhes,
    ).toEqual({
      campos: ['name', 'email', 'nickname', 'level'],
    });
  });
  it('blocks an administrator editing their own account', async () => {
    const { service, manager } = setup(Role.ADMIN, { id: 1, role: Role.ADMIN });
    await expect(
      service.atualizarUsuario(1, 1, { name: 'Outro' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('does not allow cross-company editing', async () => {
    const { service, manager } = setup(Role.ADMIN, { empresa_id: 20 });
    await expect(
      service.atualizarUsuario(1, 2, { name: 'Outro' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.atualizarUsuario(1, 2, { name: 'Outro' }, 20),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('lets platform administrators edit themselves without changing the platform role', async () => {
    const { service } = setup(Role.PLATFORM_ADMIN, {
      id: 1,
      role: Role.PLATFORM_ADMIN,
      empresa_id: null as never,
    });
    expect(
      await service.atualizarUsuario(1, 1, { name: 'Novo nome' }),
    ).toMatchObject({ name: 'Novo nome', role: Role.PLATFORM_ADMIN });
    await expect(
      service.atualizarUsuario(1, 1, { role: 'admin' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('protects another platform account and the last active company administrator', async () => {
    const platform = setup(Role.PLATFORM_ADMIN, { role: Role.PLATFORM_ADMIN });
    await expect(
      platform.service.atualizarUsuario(1, 2, { name: 'Outro' }, 10),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const admin = setup(Role.PLATFORM_ADMIN, { role: Role.ADMIN });
    await expect(
      admin.service.atualizarUsuario(1, 2, { role: 'user' }, 10),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(admin.manager.save).not.toHaveBeenCalled();
  });
  it('returns an actionable error for duplicate email', async () => {
    const { service, manager } = setup();
    manager.save.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
    await expect(
      service.atualizarUsuario(1, 2, { email: 'duplicate@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('keeps pending password setup usable when editing is attempted', async () => {
    const { service, manager } = setup(Role.PLATFORM_ADMIN, {
      password_change_required: true,
      password_setup_token_hash: 'pending-token',
    });
    await expect(
      service.atualizarUsuario(1, 2, { email: 'another@example.com' }, 10),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('does not turn school-code accounts into administrators or remove an administrator email', async () => {
    const school = setup(Role.PLATFORM_ADMIN, {
      login_code: 'SCHOOL-123',
      email: null,
    });
    await expect(
      school.service.atualizarUsuario(1, 2, { role: 'admin' }, 10),
    ).rejects.toBeInstanceOf(BadRequestException);
    const admin = setup(Role.PLATFORM_ADMIN, {
      role: Role.ADMIN,
      login_code: 'LEGACY',
    });
    await expect(
      admin.service.atualizarUsuario(1, 2, { email: null }, 10),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('does not invalidate verification or sessions for a normalized unchanged email', async () => {
    const verifiedAt = new Date();
    const { service, target } = setup(Role.PLATFORM_ADMIN, {
      email_verified_at: verifiedAt,
    });
    await service.atualizarUsuario(1, 2, { email: 'ALUNO@example.com' }, 10);
    expect(target.email_verified_at).toBe(verifiedAt);
    expect(target.session_version).toBe(1);
  });
  it('revokes an expired invitation with company scoping and audit', async () => {
    const invitation = {
      id: 5,
      empresa_id: 10,
      revoked: false,
      expires_at: new Date('2020-01-01'),
      uses: 0,
      max_uses: 1,
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(invitation),
      save: jest.fn((value: unknown) => Promise.resolve(value)),
    };
    const audit = { registrar: jest.fn() };
    const service = new ConvitesService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      audit as never,
      {} as never,
      {} as never,
    );
    await service.revogarDaEmpresa(10, 5, 1);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 5, empresa_id: 10 },
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ revoked: true }),
    );
    expect(audit.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: 10,
        atorId: 1,
        acao: 'convite.revogado',
      }),
    );
  });
});
