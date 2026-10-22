import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { Empresa } from '../empresa/empresa.entity';
import { Usuario } from '../usuario/usuario.entity';
import { AdminAuditEvent } from './entities/admin-audit-event.entity';
import {
  SchoolPilot,
  SchoolPilotStatus,
} from './entities/school-pilot.entity';
import { SaveSchoolPilotDto } from './dto/school-pilot.dto';

type SchoolPilotView = {
  id: number;
  empresaId: number;
  contactAdminUserId: number | null;
  contactAdmin: { id: number; name: string; email: string | null; active: boolean } | null;
  objective: string;
  status: SchoolPilotStatus;
  startDate: string | null;
  agreedEndDate: string | null;
  nextWeeklyMeetingAt: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class SchoolPilotService {
  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) {}

  async list(empresaId: number) {
    await this.requireCompany(this.dataSource.manager, empresaId);
    const [pilots, contacts] = await Promise.all([
      this.dataSource.getRepository(SchoolPilot).find({
        where: { empresa_id: empresaId },
        relations: ['contact_admin'],
        order: { created_at: 'DESC', id: 'DESC' },
      }),
      this.dataSource.getRepository(Usuario).find({
        where: { empresa_id: empresaId, role: Role.ADMIN },
        select: { id: true, name: true, email: true, active: true },
        order: { name: 'ASC', id: 'ASC' },
      }),
    ]);

    return {
      items: pilots.map((pilot) => this.toView(pilot)),
      contacts: contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        active: contact.active,
      })),
    };
  }

  async create(empresaId: number, actorId: number, dto: SaveSchoolPilotDto) {
    this.validateInput(dto);
    return this.dataSource.transaction(async (manager) => {
      await this.requireCompany(manager, empresaId, true);
      const contact = await this.resolveContact(
        manager,
        empresaId,
        dto.contactAdminUserId,
      );
      const pilotRepository = manager.getRepository(SchoolPilot);
      const pilot = pilotRepository.create(this.toEntity(empresaId, dto, contact));
      const saved = await pilotRepository.save(pilot);
      await this.audit(manager, empresaId, actorId, saved.id, [
        'objective',
        'status',
        'contact_admin_user_id',
        'start_date',
        'agreed_end_date',
        'next_weekly_meeting_at',
        'next_action',
        'next_action_at',
      ], 'piloto.escolar.criado');
      return this.toView(saved);
    });
  }

  async update(
    empresaId: number,
    pilotId: number,
    actorId: number,
    dto: SaveSchoolPilotDto,
  ) {
    this.validateInput(dto);
    return this.dataSource.transaction(async (manager) => {
      const pilot = await manager.findOne(SchoolPilot, {
        where: { id: pilotId, empresa_id: empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pilot) throw new NotFoundException('Piloto não encontrado');

      const contact = await this.resolveContact(
        manager,
        empresaId,
        dto.contactAdminUserId,
        pilot.contact_admin_user_id,
      );
      const next = this.toEntity(empresaId, dto, contact);
      const changedFields = this.changedFields(pilot, next);
      Object.assign(pilot, next);
      const saved = await manager.getRepository(SchoolPilot).save(pilot);
      if (changedFields.length) {
        await this.audit(
          manager,
          empresaId,
          actorId,
          pilotId,
          changedFields,
          'piloto.escolar.atualizado',
        );
      }
      return this.toView(saved);
    });
  }

  private async requireCompany(
    manager: EntityManager,
    empresaId: number,
    lock = false,
  ) {
    const company = await manager.findOne(Empresa, {
      where: { id: empresaId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }

  private async resolveContact(
    manager: EntityManager,
    empresaId: number,
    contactId: number | null | undefined,
    existingContactId?: number | null,
  ) {
    if (contactId == null) return null;
    const contact = await manager.findOne(Usuario, {
      where: { id: contactId, empresa_id: empresaId, role: Role.ADMIN },
    });
    if (!contact) {
      throw new BadRequestException(
        'O contato precisa ser um administrador desta escola',
      );
    }
    if (!contact.active && contact.id !== existingContactId) {
      throw new BadRequestException(
        'O contato precisa ser um administrador ativo desta escola',
      );
    }
    return contact;
  }

  private validateInput(dto: SaveSchoolPilotDto) {
    if (dto.objective.trim().length < 3) {
      throw new BadRequestException('Informe um objetivo com pelo menos 3 caracteres');
    }
    const start = this.dateOnly(dto.startDate);
    const end = this.dateOnly(dto.agreedEndDate);
    if (end && !start) {
      throw new BadRequestException(
        'Informe o início antes da data combinada de encerramento',
      );
    }
    if (start && end && end < start) {
      throw new BadRequestException(
        'A data de encerramento deve ser igual ou posterior ao início',
      );
    }
    if (dto.status === 'active' && !start) {
      throw new BadRequestException('Informe a data de início do piloto ativo');
    }
    if (dto.nextActionAt && !dto.nextAction?.trim()) {
      throw new BadRequestException(
        'Descreva a próxima ação antes de informar sua data',
      );
    }
  }

  private dateOnly(value?: string | null) {
    return value ? value.slice(0, 10) : null;
  }

  private toEntity(
    empresaId: number,
    dto: SaveSchoolPilotDto,
    contact: Usuario | null,
  ): Partial<SchoolPilot> {
    return {
      empresa_id: empresaId,
      contact_admin_user_id: contact?.id ?? null,
      contact_admin: contact,
      objective: dto.objective.trim(),
      status: dto.status,
      start_date: this.dateOnly(dto.startDate),
      agreed_end_date: this.dateOnly(dto.agreedEndDate),
      next_weekly_meeting_at: dto.nextWeeklyMeetingAt
        ? new Date(dto.nextWeeklyMeetingAt)
        : null,
      next_action: dto.nextAction?.trim() || null,
      next_action_at: dto.nextActionAt ? new Date(dto.nextActionAt) : null,
    };
  }

  private changedFields(
    current: SchoolPilot,
    next: Partial<SchoolPilot>,
  ): string[] {
    const fields = [
      'objective',
      'status',
      'contact_admin_user_id',
      'start_date',
      'agreed_end_date',
      'next_weekly_meeting_at',
      'next_action',
      'next_action_at',
    ] as const;
    return fields.filter((field) => {
      const before = current[field];
      const after = next[field];
      if (before instanceof Date && after instanceof Date) {
        return before.getTime() !== after.getTime();
      }
      return String(before ?? '') !== String(after ?? '');
    });
  }

  private async audit(
    manager: EntityManager,
    empresaId: number,
    actorId: number,
    pilotId: number,
    fields: string[],
    action: string,
  ) {
    await manager.getRepository(AdminAuditEvent).save({
      empresa_id: empresaId,
      ator_id: actorId,
      acao: action,
      alvo_tipo: 'school_pilot',
      alvo_id: pilotId,
      detalhes: { campos_alterados: fields },
    });
  }

  private toView(pilot: SchoolPilot): SchoolPilotView {
    return {
      id: pilot.id,
      empresaId: pilot.empresa_id,
      contactAdminUserId: pilot.contact_admin_user_id ?? null,
      contactAdmin: pilot.contact_admin
        ? {
            id: pilot.contact_admin.id,
            name: pilot.contact_admin.name,
            email: pilot.contact_admin.email,
            active: pilot.contact_admin.active,
          }
        : null,
      objective: pilot.objective,
      status: pilot.status,
      startDate: this.dateOnly(pilot.start_date),
      agreedEndDate: this.dateOnly(pilot.agreed_end_date),
      nextWeeklyMeetingAt: pilot.next_weekly_meeting_at?.toISOString() ?? null,
      nextAction: pilot.next_action,
      nextActionAt: pilot.next_action_at?.toISOString() ?? null,
      createdAt: pilot.created_at?.toISOString() ?? '',
      updatedAt: pilot.updated_at?.toISOString() ?? '',
    };
  }
}
