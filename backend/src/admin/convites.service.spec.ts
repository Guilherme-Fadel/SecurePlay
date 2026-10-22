import { BadRequestException } from '@nestjs/common';
import { ConvitesService } from './convites.service';
import { Role } from '../auth/roles.enum';
import { AdminAuditEvent } from './entities/admin-audit-event.entity';
import { Usuario } from '../usuario/usuario.entity';

describe('ConvitesService.inativarUsuarioGlobal', () => {
  const buildService = (
    user: Record<string, unknown> | null,
    adminsAtivos = 2,
    auditSave = jest.fn().mockResolvedValue(undefined),
  ) => {
    const usuarioRepository = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    const adminAuditService = { registrar: jest.fn().mockResolvedValue(undefined) };
    const eventEmitter = { emit: jest.fn() };
    const manager = {
      findOne: jest.fn().mockImplementation(async (entity, options) => {
        if (entity.name === 'Empresa') return { id: options.where.id };
        if (user && options.where.empresa_id && user.empresa_id !== options.where.empresa_id) {
          return null;
        }
        return user;
      }),
      count: jest.fn().mockResolvedValue(adminsAtivos),
      save: jest.fn().mockImplementation((entity, value) =>
        entity.name === 'AdminAuditEvent' ? auditSave(value) : Promise.resolve(value),
      ),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new ConvitesService(
      {} as never,
      usuarioRepository as never,
      {} as never,
      {} as never,
      adminAuditService as never,
      eventEmitter as never,
      dataSource as never,
    );
    return { service, usuarioRepository, adminAuditService, eventEmitter, dataSource, manager };
  };

  it('inativa um usuário e retorna o novo estado', async () => {
    const user = {
      id: 12,
      empresa_id: 7,
      name: 'Participante',
      email: 'participante@secureplay.test',
      role: Role.USER,
      level: 2,
      active: true,
      nickname: null,
      nickname_pending: null,
      nickname_request_status: 'none',
    };
    const { service, usuarioRepository, adminAuditService, eventEmitter, manager } = buildService(user);

    await expect(service.inativarUsuarioGlobal(1, 12, 'Fim do vínculo escolar')).resolves.toMatchObject({
      id: 12,
      active: false,
    });
    expect(manager.save).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ active: false, session_version: 1 }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      AdminAuditEvent,
      expect.objectContaining({
        acao: 'usuario.inativado',
        alvo_id: 12,
        ator_id: 1,
        detalhes: expect.objectContaining({ motivo: 'Fim do vínculo escolar' }),
      }),
    );
    expect(adminAuditService.registrar).not.toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith('usuario.inativado', { userId: 12 });
  });

  it('impede alteração do status da própria conta', async () => {
    const { service, usuarioRepository } = buildService({
      id: 12,
      role: Role.ADMIN,
      active: true,
    });

    await expect(service.inativarUsuarioGlobal(12, 12, 'Ajuste administrativo')).rejects.toBeInstanceOf(
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

    await expect(service.inativarUsuarioGlobal(1, 12, 'Ajuste administrativo')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(usuarioRepository.save).not.toHaveBeenCalled();
  });

  it('impede inativar o último administrador ativo da escola', async () => {
    const { service, manager, eventEmitter } = buildService({
      id: 12,
      empresa_id: 7,
      email: 'admin@secureplay.test',
      role: Role.ADMIN,
      active: true,
    }, 1);

    await expect(service.inativarUsuarioGlobal(1, 12, 'Ajuste administrativo')).rejects.toThrow(
      'A escola precisa manter ao menos um administrador ativo',
    );
    expect(manager.save).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('exige motivo não vazio dentro do limite antes de abrir a transação', async () => {
    const { service, dataSource } = buildService({
      id: 12,
      empresa_id: 7,
      role: Role.USER,
      active: true,
    });

    await expect(service.inativarUsuarioGlobal(1, 12, '   ')).rejects.toThrow(
      'Informe um motivo entre 5 e 300 caracteres',
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('aborta a inativação se a auditoria transacional falhar', async () => {
    const { service, manager, eventEmitter } = buildService(
      {
        id: 12,
        empresa_id: 7,
        email: 'aluno@secureplay.test',
        role: Role.USER,
        active: true,
      },
      2,
      jest.fn().mockRejectedValue(new Error('audit failed')),
    );

    await expect(service.inativarUsuarioGlobal(1, 12, 'Ajuste administrativo')).rejects.toThrow('audit failed');
    expect(manager.save).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('reativa a conta existente sem substituir senha ou dados e persiste auditoria', async () => {
    const user = {
      id: 12,
      empresa_id: 7,
      name: 'Participante',
      email: 'participante@secureplay.test',
      password: 'hash-preservado',
      role: Role.USER,
      active: false,
      level: 3,
    };
    const { service, manager, eventEmitter } = buildService(user);

    await expect(service.reativarUsuarioGlobal(1, 12, 'Retorno autorizado')).resolves.toMatchObject({
      id: 12,
      active: true,
    });
    expect(user.password).toBe('hash-preservado');
    expect(manager.save).toHaveBeenCalledWith(
      Usuario,
      expect.objectContaining({ active: true, session_version: 1 }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      AdminAuditEvent,
      expect.objectContaining({
        acao: 'usuario.reativado',
        alvo_id: 12,
        detalhes: expect.objectContaining({ motivo: 'Retorno autorizado' }),
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('usuario.reativado', { userId: 12 });
  });

  it('não permite ao administrador reativar usuário de outra escola', async () => {
    const user = {
      id: 12,
      empresa_id: 20,
      role: Role.USER,
      active: false,
    };
    const { service, manager } = buildService(user);

    await expect(service.reativarUsuarioDaEmpresa(7, 1, 12, 'Retorno autorizado')).rejects.toThrow(
      'Usuário não encontrado',
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('não permite ao administrador inativar usuário de outra escola', async () => {
    const user = {
      id: 12,
      empresa_id: 20,
      role: Role.USER,
      active: true,
    };
    const { service, manager } = buildService(user);

    await expect(service.inativarUsuarioDaEmpresa(7, 1, 12, 'Fim do vínculo escolar')).rejects.toThrow(
      'Usuário não encontrado',
    );
    expect(manager.save).not.toHaveBeenCalled();
  });
});

describe('ConvitesService.listarApelidosPendentesDaEmpresa', () => {
  it('pagina somente apelidos pendentes de participantes', async () => {
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
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
      { registrar: jest.fn() } as never,
      { emit: jest.fn() } as never,
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
    expect(query.orderBy).toHaveBeenCalledWith('usuario.id', 'DESC');
    expect(query.skip).toHaveBeenCalledWith(25);
    expect(query.take).toHaveBeenCalledWith(25);
    await service.listarApelidosPendentesDaEmpresa(4, { sort: 'asc' });
    expect(query.orderBy).toHaveBeenCalledWith('usuario.nickname_pending', 'ASC');
    expect(query.addOrderBy).toHaveBeenCalledWith('usuario.id', 'ASC');
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
      { registrar: jest.fn() } as never,
      { emit: jest.fn() } as never,
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
    await service.listarUsuariosPaginadosDaEmpresa(7, { sort: 'desc' });
    expect(query.orderBy).toHaveBeenCalledWith('usuario.name', 'DESC');
    expect(query.addOrderBy).toHaveBeenCalledWith('usuario.id', 'DESC');
  });
});

describe('ConvitesService.listarPaginadosDaEmpresa', () => {
  it('filtra pelo tenant e e-mail, ordena e retorna metadados da página', async () => {
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{
        id: 3, email: 'ana@example.test', role: Role.USER,
        expires_at: new Date('2026-10-01T00:00:00Z'), created_at: new Date('2026-09-20T00:00:00Z'),
        max_uses: 1, uses: 0, revoked: false,
      }], 31]),
    };
    const service = new ConvitesService(
      { createQueryBuilder: jest.fn().mockReturnValue(query) } as never,
      {} as never, {} as never, {} as never, { registrar: jest.fn() } as never,
      { emit: jest.fn() } as never,
      {} as never,
    );

    await expect(service.listarPaginadosDaEmpresa(8, {
      page: 2, pageSize: 10, search: 'ana@', sort: 'asc',
    })).resolves.toMatchObject({
      items: [expect.objectContaining({ email: 'ana@example.test', role: Role.USER })],
      page: 2, pageSize: 10, total: 31, totalPages: 4,
    });
    expect(query.where).toHaveBeenCalledWith('convite.empresa_id = :empresaId', { empresaId: 8 });
    expect(query.andWhere).toHaveBeenCalledWith('convite.email LIKE :search', { search: '%ana@%' });
    expect(query.orderBy).toHaveBeenCalledWith('convite.created_at', 'ASC');
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.take).toHaveBeenCalledWith(10);
  });

  it('aplica paginação padrão e desc para sort ausente ou inválido', async () => {
    const query = {
      where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(), getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const service = new ConvitesService(
      { createQueryBuilder: jest.fn().mockReturnValue(query) } as never,
      {} as never, {} as never, {} as never, { registrar: jest.fn() } as never,
      { emit: jest.fn() } as never,
      {} as never,
    );

    await expect(service.listarPaginadosDaEmpresa(8, { page: 0, pageSize: 500, sort: 'other' as never }))
      .resolves.toMatchObject({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 });
    expect(query.orderBy).toHaveBeenCalledWith('convite.created_at', 'DESC');
    expect(query.where).toHaveBeenCalledWith('convite.empresa_id = :empresaId', { empresaId: 8 });
  });
});

describe('ConvitesService.obterResumoAdministrativoDaEmpresa', () => {
  it('retorna somente indicadores administrativos da empresa', async () => {
    const nicknameQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(3),
    };
    const inviteQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(4),
    };
    const service = new ConvitesService(
      { createQueryBuilder: jest.fn().mockReturnValue(inviteQuery) } as never,
      {
        count: jest.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(2),
        createQueryBuilder: jest.fn().mockReturnValue(nicknameQuery),
      } as never,
      {} as never,
      {} as never,
      { registrar: jest.fn() } as never,
      { emit: jest.fn() } as never,
      {} as never,
    );

    await expect(service.obterResumoAdministrativoDaEmpresa(7)).resolves.toEqual({
      usuariosAtivos: 12,
      usuariosInativos: 2,
      apelidosPendentes: 3,
      convitesAtivos: 4,
    });
  });
});

describe('ConvitesService.emitirLinkRedefinicaoAluno', () => {
  it('emite token curto, grava somente o hash e audita a ação sem segredo', async () => {
    const student = {
      id: 32,
      email: null,
      login_code: 'SP-A1B2C3D4E5F60718',
      active: true,
      session_version: 4,
    };
    const auditEvents: unknown[] = [];
    const manager = {
      findOne: jest.fn().mockResolvedValue(student),
      save: jest.fn().mockImplementation((entity, value) => {
        if (entity === AdminAuditEvent) auditEvents.push(value);
        return Promise.resolve(value);
      }),
    };
    const service = new ConvitesService(
      {} as never,
      { findOne: jest.fn().mockResolvedValue({ id: 2, empresa_id: 8 }) } as never,
      { findOne: jest.fn().mockResolvedValue({ id: 8 }) } as never,
      {} as never,
      {} as never,
      {} as never,
      { transaction: (callback: (value: unknown) => unknown) => callback(manager) } as never,
    );

    const result = await service.emitirLinkRedefinicaoAluno(2, 32);

    expect(result.reset_token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(student.password_reset_token_hash).not.toBe(result.reset_token);
    expect(student.password_reset_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(student.session_version).toBe(5);
    expect(auditEvents[0]).toEqual(expect.objectContaining({
      acao: 'aluno.link_redefinicao_emitido',
      detalhes: { expira_em_minutos: 20 },
    }));
    expect(JSON.stringify(auditEvents)).not.toContain(result.reset_token);
  });

  it('não emite link para conta com e-mail ou identificador ausente', async () => {
    const manager = { findOne: jest.fn().mockResolvedValue({
      id: 32, email: 'student@example.test', login_code: null, active: true,
    }), save: jest.fn() };
    const service = new ConvitesService(
      {} as never,
      { findOne: jest.fn().mockResolvedValue({ id: 2, empresa_id: 8 }) } as never,
      { findOne: jest.fn().mockResolvedValue({ id: 8 }) } as never,
      {} as never, {} as never, {} as never,
      { transaction: (callback: (value: unknown) => unknown) => callback(manager) } as never,
    );

    await expect(service.emitirLinkRedefinicaoAluno(2, 32))
      .rejects.toThrow('Aluno não encontrado nesta escola');
    expect(manager.save).not.toHaveBeenCalled();
  });
});
