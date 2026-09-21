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

describe('ConvitesService.listarApelidosPendentesDaEmpresa', () => {
  it('pagina somente apelidos pendentes de participantes', async () => {
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: 9,
            name: 'Ana',
            email: 'ana@secureplay.test',
            role: Role.USER,
            level: 3,
            active: true,
            nickname: null,
            nickname_pending: 'Aninha',
            nickname_request_status: 'pending',
          },
        ],
        26,
      ]),
    };
    const usuarioRepository = { createQueryBuilder: jest.fn().mockReturnValue(query) };
    const service = new ConvitesService(
      {} as never,
      usuarioRepository as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.listarApelidosPendentesDaEmpresa(4, {
        page: 2,
        pageSize: 25,
        search: 'Ana',
      }),
    ).resolves.toEqual({
      items: [expect.objectContaining({ id: 9, nickname_pending: 'Aninha' })],
      page: 2,
      pageSize: 25,
      total: 26,
      totalPages: 2,
    });
    expect(query.where).toHaveBeenCalledWith('usuario.empresa_id = :empresaId', { empresaId: 4 });
    expect(query.andWhere).toHaveBeenCalledWith('usuario.role = :role', { role: Role.USER });
    expect(query.skip).toHaveBeenCalledWith(25);
    expect(query.take).toHaveBeenCalledWith(25);
  });
});

describe('ConvitesService.listarUsuariosPaginadosDaEmpresa', () => {
  it('filtra gerência e pagina a listagem de usuários', async () => {
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 1]),
    };
    const service = new ConvitesService(
      {} as never,
      { createQueryBuilder: jest.fn().mockReturnValue(query) } as never,
      {} as never,
      {} as never,
    );

    await expect(service.listarUsuariosPaginadosDaEmpresa(7, {
      page: 1,
      pageSize: 25,
      status: 'management',
    })).resolves.toMatchObject({ total: 1, totalPages: 1, items: [] });
    expect(query.andWhere).toHaveBeenCalledWith('usuario.role IN (:...roles)', {
      roles: [Role.ADMIN, Role.PLATFORM_ADMIN],
    });
    expect(query.addOrderBy).toHaveBeenCalledWith('usuario.id', 'ASC');
  });
});
