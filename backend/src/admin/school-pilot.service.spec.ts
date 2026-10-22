import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { Empresa } from '../empresa/empresa.entity';
import { Usuario } from '../usuario/usuario.entity';
import { AdminAuditEvent } from './entities/admin-audit-event.entity';
import { SchoolPilot } from './entities/school-pilot.entity';
import { SchoolPilotService } from './school-pilot.service';

describe('SchoolPilotService', () => {
  const company = { id: 20 } as Empresa;
  const schoolAdmin = {
    id: 7,
    name: 'Admin Escola',
    email: 'admin@escola.invalid',
    active: true,
    role: Role.ADMIN,
    empresa_id: 20,
  } as Usuario;

  function createHarness() {
    const pilotRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({
        ...value,
        id: 31,
        created_at: new Date('2026-10-22T12:00:00Z'),
        updated_at: new Date('2026-10-22T12:00:00Z'),
      })),
    };
    const userRepository = {
      find: jest.fn().mockResolvedValue([schoolAdmin]),
    };
    const auditRepository = { save: jest.fn().mockResolvedValue({ id: 1 }) };
    const manager = {
      findOne: jest.fn(async (entity: unknown, options: { where: Record<string, unknown> }) => {
        if (entity === Empresa) return company;
        if (entity === Usuario) {
          return options.where.id === schoolAdmin.id &&
            options.where.empresa_id === schoolAdmin.empresa_id &&
            options.where.role === Role.ADMIN
            ? schoolAdmin
            : null;
        }
        if (entity === SchoolPilot) return null;
        return null;
      }),
      getRepository: jest.fn((entity: unknown) => {
        if (entity === SchoolPilot) return pilotRepository;
        if (entity === AdminAuditEvent) return auditRepository;
        throw new Error('Unexpected repository');
      }),
    };
    const dataSource = {
      manager,
      getRepository: jest.fn((entity: unknown) => {
        if (entity === SchoolPilot) return pilotRepository;
        if (entity === Usuario) return userRepository;
        throw new Error('Unexpected repository');
      }),
      transaction: jest.fn((work: (manager: EntityManager) => unknown) =>
        work(manager as unknown as EntityManager),
      ),
    };
    return {
      service: new SchoolPilotService(dataSource as unknown as DataSource),
      dataSource,
      manager,
      pilotRepository,
      userRepository,
      auditRepository,
    };
  }

  const validInput = {
    objective: 'Validar a primeira aula com a escola',
    status: 'planned' as const,
    contactAdminUserId: 7,
    startDate: '2026-11-01',
    agreedEndDate: '2026-11-30',
    nextWeeklyMeetingAt: '2026-11-02T13:00:00.000Z',
    nextAction: 'Agendar reunião semanal',
    nextActionAt: '2026-10-29T13:00:00.000Z',
  };

  it('lists only school administrators as contact options and whitelists contact fields', async () => {
    const { service, dataSource, userRepository, pilotRepository } = createHarness();
    pilotRepository.find.mockResolvedValue([
      {
        id: 31,
        empresa_id: 20,
        contact_admin_user_id: 7,
        contact_admin: schoolAdmin,
        objective: validInput.objective,
        status: 'planned',
        start_date: '2026-11-01',
        agreed_end_date: '2026-11-30',
        next_weekly_meeting_at: new Date('2026-11-02T13:00:00Z'),
        next_action: validInput.nextAction,
        next_action_at: new Date('2026-10-29T13:00:00Z'),
        created_at: new Date('2026-10-22T12:00:00Z'),
        updated_at: new Date('2026-10-22T12:00:00Z'),
      },
    ]);

    const result = await service.list(20);

    expect(dataSource.manager.findOne).toHaveBeenCalledWith(Empresa, {
      where: { id: 20 },
    });
    expect(userRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { empresa_id: 20, role: Role.ADMIN } }),
    );
    expect(result.contacts).toEqual([
      { id: 7, name: 'Admin Escola', email: 'admin@escola.invalid', active: true },
    ]);
    expect(result.items[0].contactAdmin).toEqual(result.contacts[0]);
    expect(result.items[0]).not.toHaveProperty('contact_admin.password');
  });

  it('creates an audited pilot only when its contact is an admin in the target school', async () => {
    const { service, manager, pilotRepository, auditRepository } = createHarness();

    const result = await service.create(20, 9, validInput);

    expect(result).toMatchObject({
      id: 31,
      empresaId: 20,
      contactAdminUserId: 7,
      status: 'planned',
    });
    expect(manager.findOne).toHaveBeenCalledWith(
      Usuario,
      expect.objectContaining({
        where: { id: 7, empresa_id: 20, role: Role.ADMIN },
      }),
    );
    expect(pilotRepository.save).toHaveBeenCalledTimes(1);
    expect(auditRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        empresa_id: 20,
        ator_id: 9,
        acao: 'piloto.escolar.criado',
        alvo_tipo: 'school_pilot',
        detalhes: expect.objectContaining({
          campos_alterados: expect.arrayContaining(['objective', 'status']),
        }),
      }),
    );
    expect(JSON.stringify(auditRepository.save.mock.calls[0][0])).not.toContain(
      validInput.objective,
    );
  });

  it('rejects a contact from another school before creating or auditing', async () => {
    const { service, manager, pilotRepository, auditRepository } = createHarness();
    manager.findOne.mockImplementation(async (entity: unknown) =>
      entity === Empresa ? company : null,
    );

    await expect(service.create(20, 9, validInput)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(pilotRepository.save).not.toHaveBeenCalled();
    expect(auditRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an inactive administrator as a new pilot contact', async () => {
    const { service, manager, pilotRepository, auditRepository } = createHarness();
    manager.findOne.mockImplementation(async (entity: unknown) =>
      entity === Empresa ? company : entity === Usuario ? { ...schoolAdmin, active: false } : null,
    );

    await expect(service.create(20, 9, validInput)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(pilotRepository.save).not.toHaveBeenCalled();
    expect(auditRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an end date before the start and active pilots without a start', async () => {
    const { service, dataSource } = createHarness();

    await expect(
      service.create(20, 9, {
        ...validInput,
        startDate: '2026-11-30',
        agreedEndDate: '2026-11-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(20, 9, {
        ...validInput,
        status: 'active',
        startDate: null,
        agreedEndDate: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects an objective that becomes empty after trimming', async () => {
    const { service, dataSource, pilotRepository } = createHarness();

    await expect(
      service.create(20, 9, { ...validInput, objective: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(pilotRepository.save).not.toHaveBeenCalled();
  });

  it('scopes pilot edits by both pilot and school', async () => {
    const { service, manager, auditRepository } = createHarness();
    manager.findOne.mockImplementation(async (entity: unknown) =>
      entity === SchoolPilot ? null : null,
    );

    await expect(service.update(20, 31, 9, validInput)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(manager.findOne).toHaveBeenCalledWith(
      SchoolPilot,
      expect.objectContaining({ where: { id: 31, empresa_id: 20 } }),
    );
    expect(auditRepository.save).not.toHaveBeenCalled();
  });
});
