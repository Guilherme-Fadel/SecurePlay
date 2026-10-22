import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuarioService } from './usuario.service';
import { Role } from '../auth/roles.enum';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UsuarioService.changePassword', () => {
  const repository = () => ({
    findOne: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejeita a troca quando a senha atual não confere', async () => {
    const users = repository();
    users.findOne.mockResolvedValue({ id: 11, password: '$2b$10$hash-atual' });
    bcrypt.compare.mockResolvedValue(false);
    const service = new UsuarioService(users as never, undefined as never);

    await expect(
      service.changePassword(11, {
        currentPassword: 'senha-incorreta',
        newPassword: 'nova-senha-segura',
      }),
    ).rejects.toMatchObject({ status: 400, message: 'Senha atual inválida' });

    expect(users.save).not.toHaveBeenCalled();
  });

  it('faz hash da nova senha antes de persistir', async () => {
    const users = repository();
    const user = { id: 11, password: '$2b$10$hash-atual' };
    users.findOne.mockResolvedValue(user);
    users.save.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('$2b$10$novo-hash');
    const service = new UsuarioService(users as never, undefined as never);

    await expect(
      service.changePassword(11, {
        currentPassword: 'senha-atual',
        newPassword: 'nova-senha-segura',
      }),
    ).resolves.toEqual({ message: 'Senha alterada com sucesso' });

    expect(bcrypt.hash).toHaveBeenCalledWith('nova-senha-segura', 10);
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ password: '$2b$10$novo-hash' }),
    );
  });

  it('rejeita uma nova senha igual à atual antes de consultar o banco', async () => {
    const users = repository();
    const service = new UsuarioService(users as never, undefined as never);

    await expect(
      service.changePassword(11, {
        currentPassword: 'mesma-senha',
        newPassword: 'mesma-senha',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(users.findOne).not.toHaveBeenCalled();
  });
});

describe('UsuarioService.getUsuarioByLoginIdentifier', () => {
  it('normaliza código escolar sem passar pela busca de e-mail', async () => {
    const users = { findOne: jest.fn().mockResolvedValue({ id: 13 }) };
    const service = new UsuarioService(users as never, undefined as never);

    await expect(service.getUsuarioByLoginIdentifier('sp-a1b2c3d4e5f60718'))
      .resolves.toEqual({ id: 13 });
    expect(users.findOne).toHaveBeenCalledWith({
      where: { login_code: 'SP-A1B2C3D4E5F60718' },
    });
  });

  it('preserva a busca literal e tenta a forma minúscula para e-mails legados', async () => {
    const users = { findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 14 }) };
    const service = new UsuarioService(users as never, undefined as never);

    await service.getUsuarioByLoginIdentifier('  ADMIN@ESCOLA.TEST  ');
    expect(users.findOne).toHaveBeenCalledWith({
      where: { email: 'ADMIN@ESCOLA.TEST' },
    });
    expect(users.findOne).toHaveBeenLastCalledWith({
      where: { email: 'admin@escola.test' },
    });
  });
});

describe('UsuarioService.requestNickname', () => {
  it.each([Role.ADMIN, Role.PLATFORM_ADMIN])(
    'recusa apelido para %s',
    async (role) => {
      const users = {
        findOne: jest.fn(),
        save: jest.fn(),
      };
      users.findOne.mockResolvedValue({ id: 11, role, empresa_id: 2 });
      const service = new UsuarioService(users as never, undefined as never);

      await expect(
        service.requestNickname(11, 'Guardião Solar'),
      ).rejects.toMatchObject({
        status: 400,
      });
      expect(users.save).not.toHaveBeenCalled();
    },
  );
});
