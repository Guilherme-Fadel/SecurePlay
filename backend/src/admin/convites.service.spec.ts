import { BadRequestException } from '@nestjs/common';
import { ConvitesService } from './convites.service';
import { Role } from '../auth/roles.enum';

describe('ConvitesService.inativarUsuarioGlobal', () => {
  const buildService = (user: Record<string, unknown> | null) => {
    const usuarioRepository = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    const service = new ConvitesService(
      {} as never,
      usuarioRepository as never,
      {} as never,
      {} as never,
    );
    return { service, usuarioRepository };
  };

  it('inativa um usuário e retorna o novo estado', async () => {
    const user = {
      id: 12,
      name: 'Participante',
      email: 'participante@secureplay.test',
      role: Role.USER,
      level: 2,
      active: true,
      nickname: null,
      nickname_pending: null,
      nickname_request_status: 'none',
    };
    const { service, usuarioRepository } = buildService(user);

    await expect(service.inativarUsuarioGlobal(1, 12)).resolves.toMatchObject({
      id: 12,
      active: false,
    });
    expect(usuarioRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ active: false }),
    );
  });

  it('impede inativação da própria conta', async () => {
    const { service, usuarioRepository } = buildService({
      id: 12,
      role: Role.ADMIN,
      active: true,
    });

    await expect(service.inativarUsuarioGlobal(12, 12)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(usuarioRepository.save).not.toHaveBeenCalled();
  });

  it('protege contas de administrador da plataforma', async () => {
    const { service, usuarioRepository } = buildService({
      id: 12,
      role: Role.PLATFORM_ADMIN,
      active: true,
    });

    await expect(service.inativarUsuarioGlobal(1, 12)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(usuarioRepository.save).not.toHaveBeenCalled();
  });
});
