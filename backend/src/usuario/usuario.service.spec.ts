import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuarioService } from './usuario.service';

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
    (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>).mockResolvedValue(false);
    const service = new UsuarioService(users as never);

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
    (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>).mockResolvedValue(true);
    (bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>).mockResolvedValue('$2b$10$novo-hash');
    const service = new UsuarioService(users as never);

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
    const service = new UsuarioService(users as never);

    await expect(
      service.changePassword(11, {
        currentPassword: 'mesma-senha',
        newPassword: 'mesma-senha',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(users.findOne).not.toHaveBeenCalled();
  });
});
