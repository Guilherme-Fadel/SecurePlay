import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuarioService } from './usuario.service';
import { Role } from '../auth/roles.enum';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
const compareMock = bcrypt.compare as jest.Mock<
  Promise<boolean>,
  [string, string]
>;
const hashMock = bcrypt.hash as jest.Mock<Promise<string>, [string, number]>;

describe('UsuarioService.changePassword', () => {
  const repository = () => {
    const users = { findOne: jest.fn(), save: jest.fn() };
    return Object.assign(users, {
      manager: {
        transaction: (action: (manager: unknown) => Promise<unknown>) =>
          action({ getRepository: () => users }),
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejeita a troca quando a senha atual não confere', async () => {
    const users = repository();
    users.findOne.mockResolvedValue({
      id: 11,
      password: '$2b$10$hash-atual',
      active: true,
      role: Role.USER,
      session_version: 0,
    });
    compareMock.mockResolvedValue(false);
    const service = new UsuarioService(users as never, undefined as never);

    await expect(
      service.changePassword(
        11,
        {
          currentPassword: 'senha-incorreta',
          newPassword: 'nova-senha-segura',
        },
        0,
      ),
    ).rejects.toMatchObject({ status: 400, message: 'Senha atual inválida' });

    expect(users.save).not.toHaveBeenCalled();
  });

  it('faz hash da nova senha antes de persistir', async () => {
    const users = repository();
    const user = {
      id: 11,
      password: '$2b$10$hash-atual',
      active: true,
      role: Role.USER,
      session_version: 0,
    };
    users.findOne.mockResolvedValue(user);
    users.save.mockResolvedValue(user);
    compareMock.mockResolvedValue(true);
    hashMock.mockResolvedValue('$2b$10$novo-hash');
    const service = new UsuarioService(users as never, undefined as never);

    await expect(
      service.changePassword(
        11,
        {
          currentPassword: 'senha-atual',
          newPassword: 'nova-senha-segura',
        },
        0,
      ),
    ).resolves.toMatchObject({ id: 11, session_version: 1 });

    expect(bcrypt.hash).toHaveBeenCalledWith('nova-senha-segura', 10);
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ password: '$2b$10$novo-hash' }),
    );
  });

  it('rejeita uma nova senha igual à atual antes de consultar o banco', async () => {
    const users = repository();
    const service = new UsuarioService(users as never, undefined as never);

    await expect(
      service.changePassword(
        11,
        {
          currentPassword: 'mesma-senha',
          newPassword: 'mesma-senha',
        },
        0,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(users.findOne).not.toHaveBeenCalled();
  });
});

describe('UsuarioService.getUsuarioByLoginIdentifier', () => {
  it('busca usuário normalizado sem usar apelido, empresa ou e-mail', async () => {
    const users = { findOne: jest.fn().mockResolvedValue({ id: 15 }) };
    const service = new UsuarioService(users as never, undefined as never);
    await expect(
      service.getUsuarioByLoginIdentifier('  Joao.Silva  '),
    ).resolves.toEqual({ id: 15 });
    expect(users.findOne).toHaveBeenCalledTimes(1);
    expect(users.findOne).toHaveBeenCalledWith({
      where: { username: 'joao.silva' },
    });
  });

  it.each(['abc@', 'a b', 'joão', 'sp-usuario', 'ab'])(
    'não interpreta entrada inválida %s como apelido',
    async (identifier) => {
      const users = { findOne: jest.fn().mockResolvedValue(null) };
      const service = new UsuarioService(users as never, undefined as never);
      await expect(
        service.getUsuarioByLoginIdentifier(identifier),
      ).resolves.toBeUndefined();
      if (!identifier.includes('@'))
        expect(users.findOne).not.toHaveBeenCalled();
    },
  );
  it('normaliza código escolar sem passar pela busca de e-mail', async () => {
    const users = { findOne: jest.fn().mockResolvedValue({ id: 13 }) };
    const service = new UsuarioService(users as never, undefined as never);

    await expect(
      service.getUsuarioByLoginIdentifier('sp-a1b2c3d4e5f60718'),
    ).resolves.toEqual({ id: 13 });
    expect(users.findOne).toHaveBeenCalledWith({
      where: { login_code: 'SP-A1B2C3D4E5F60718' },
    });
  });

  it('preserva a busca literal e tenta a forma minúscula para e-mails legados', async () => {
    const users = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 14 }),
    };
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
