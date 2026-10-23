import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { Empresa } from '../empresa/empresa.entity';
import { EmpresaParametrosAudit } from '../empresa/empresa-parametros-audit.entity';
import { Convite } from './entities/convite.entity';
import { AdminAuditEvent } from './entities/admin-audit-event.entity';
import { SchoolPilot } from './entities/school-pilot.entity';

export function platformPage(
  value: unknown,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new BadRequestException('Paginação inválida');
  return Math.min(parsed, maximum);
}

@Injectable()
export class PlatformRecordsService {
  constructor(@Inject('DATA_SOURCE') private readonly source: DataSource) {}

  async list(
    resource: string,
    filters: {
      page?: string;
      pageSize?: string;
      empresaId?: string;
      search?: string;
      status?: string;
      sort?: string;
    },
  ) {
    const entities: Record<string, EntityTarget<ObjectLiteral>> = {
      users: Usuario,
      nicknames: Usuario,
      invitations: Convite,
      'audit-settings': EmpresaParametrosAudit,
      'audit-events': AdminAuditEvent,
      pilots: SchoolPilot,
    };
    if (!Object.hasOwn(entities, resource))
      throw new BadRequestException('Lista inválida');
    if (
      Object.values(filters).some(
        (value) => value !== undefined && typeof value !== 'string',
      )
    )
      throw new BadRequestException('Filtros inválidos');
    const page = platformPage(filters.page, 1);
    const pageSize = platformPage(filters.pageSize, 25, 100);
    const empresaId = filters.empresaId
      ? platformPage(filters.empresaId, 1)
      : undefined;
    const offset = (page - 1) * pageSize;
    if (!Number.isSafeInteger(offset))
      throw new BadRequestException('Página inválida');
    const query = this.source
      .getRepository(entities[resource])
      .createQueryBuilder('r')
      .leftJoin(Empresa, 'company', 'company.id = r.empresa_id')
      .select('r.id', 'id')
      .addSelect('r.empresa_id', 'empresaId')
      .addSelect('company.nome', 'empresaNome');
    if (empresaId) query.andWhere('r.empresa_id = :empresaId', { empresaId });
    let searchFields: string[];
    if (resource === 'users' || resource === 'nicknames') {
      query
        .addSelect(
          resource === 'nicknames' ? 'r.nickname_pending' : 'r.name',
          'title',
        )
        .addSelect('r.email', 'subtitle')
        .addSelect('r.level', 'level')
        .addSelect('r.role', 'role')
        .addSelect('r.nickname', 'nickname')
        .addSelect(
          "CASE WHEN r.active = :enabled THEN 'active' ELSE 'inactive' END",
          'status',
        )
        .setParameter('enabled', true);
      if (resource === 'nicknames')
        query
          .andWhere(
            'r.role = :role AND r.nickname_request_status = :pending AND r.nickname_pending IS NOT NULL',
            { role: 'user', pending: 'pending' },
          )
          .addSelect('r.name', 'detail');
      if (filters.status === 'active' || filters.status === 'inactive')
        query.andWhere('r.active = :active', {
          active: filters.status === 'active',
        });
      if (filters.status === 'management')
        query.andWhere('r.role IN (:...roles)', {
          roles: ['admin', 'platform_admin'],
        });
      searchFields = ['r.name', 'r.email', 'r.nickname', 'r.nickname_pending'];
    } else if (resource === 'invitations') {
      query
        .addSelect('r.email', 'title')
        .addSelect('r.role', 'role')
        .addSelect('r.registration_mode', 'registrationMode')
        .addSelect('r.created_at', 'createdAt')
        .addSelect('r.uses', 'uses')
        .addSelect('r.max_uses', 'maxUses')
        .addSelect('r.expires_at', 'expiresAt')
        .addSelect(
          "CASE WHEN r.revoked = :revoked THEN 'revoked' WHEN r.expires_at <= :now THEN 'expired' WHEN r.uses >= r.max_uses THEN 'used' ELSE 'active' END",
          'status',
        )
        .setParameters({ revoked: true, now: new Date() });
      searchFields = ['r.email'];
    } else if (resource === 'pilots') {
      query
        .addSelect('r.objective', 'title')
        .addSelect('r.status', 'status')
        .addSelect('r.next_action', 'detail')
        .addSelect('r.created_at', 'createdAt');
      searchFields = ['r.objective', 'r.next_action'];
    } else {
      const actorKey =
        resource === 'audit-events' ? 'ator_id' : 'alterado_por_id';
      query
        .leftJoin(Usuario, 'actor', `actor.id = r.${actorKey}`)
        .addSelect('actor.name', 'title')
        .addSelect('actor.email', 'subtitle')
        .addSelect('r.created_at', 'createdAt');
      if (resource === 'audit-events') query.addSelect('r.acao', 'detail');
      else
        query
          .addSelect('r.anterior', 'previous')
          .addSelect('r.atual', 'current');
      searchFields = [
        'actor.name',
        'actor.email',
        ...(resource === 'audit-events' ? ['r.acao'] : []),
      ];
    }
    const search = filters.search?.trim().slice(0, 100);
    if (search)
      query.andWhere(
        `(${[...searchFields, 'company.nome'].map((field) => `${field} LIKE :search`).join(' OR ')})`,
        { search: `%${search}%` },
      );
    const namedSort = filters.sort === 'asc' || filters.sort === 'desc';
    const sortField = namedSort
      ? resource === 'nicknames'
        ? 'r.nickname_pending'
        : resource === 'users'
          ? 'r.name'
          : resource === 'invitations'
            ? 'r.email'
            : resource === 'pilots'
              ? 'r.objective'
              : 'actor.name'
      : 'r.id';
    query
      .orderBy(sortField, filters.sort === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('r.id', 'DESC');
    const [raw, total] = await Promise.all([
      query
        .clone()
        .offset(offset)
        .limit(pageSize)
        .getRawMany<Record<string, unknown>>(),
      query.clone().getCount(),
    ]);
    const items = raw.map(({ previous, current, ...item }) => {
      if (resource !== 'audit-settings') return item;
      const parse = (value: unknown): Record<string, unknown> =>
        typeof value === 'string'
          ? (JSON.parse(value) as Record<string, unknown>)
          : (value as Record<string, unknown>);
      const before = parse(previous) ?? {};
      const after = parse(current) ?? {};
      return {
        ...item,
        detail: `${Object.keys(after).filter((key) => JSON.stringify(after[key]) !== JSON.stringify(before[key])).length} configurações atualizadas`,
      };
    });
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
