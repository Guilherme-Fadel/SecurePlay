import { BadRequestException } from '@nestjs/common';
import { PlatformRecordsService } from './platform-records.service';
import { PlatformRecordsController } from './platform-records.controller';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

describe('Platform paginated records', () => {
  function setup(
    rows: Record<string, unknown>[] = [
      { id: 4, empresaId: 2, title: 'Aluno', empresaNome: 'Escola' },
    ],
  ) {
    const query: Record<string, jest.Mock> = {};
    for (const method of [
      'leftJoin',
      'select',
      'addSelect',
      'andWhere',
      'setParameter',
      'setParameters',
      'orderBy',
      'addOrderBy',
      'offset',
      'limit',
      'clone',
    ])
      query[method] = jest.fn().mockReturnValue(query);
    query.getRawMany = jest.fn().mockResolvedValue(rows);
    query.getCount = jest.fn().mockResolvedValue(2501);
    const source = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(query),
      }),
    };
    return {
      query,
      source,
      service: new PlatformRecordsService(source as never),
    };
  }

  it('allows only the platform role on the global endpoint', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlatformRecordsController)).toEqual([
      Role.PLATFORM_ADMIN,
    ]);
  });

  it('paginates globally in SQL and never selects full user entities', async () => {
    const { service, query } = setup();
    await expect(
      service.list('users', { page: '3', pageSize: '25' }),
    ).resolves.toMatchObject({
      total: 2501,
      totalPages: 101,
      page: 3,
      pageSize: 25,
    });
    expect(query.offset).toHaveBeenCalledWith(50);
    expect(query.limit).toHaveBeenCalledWith(25);
    expect(query.andWhere).not.toHaveBeenCalled();
    const fields = JSON.stringify({
      select: query.select.mock.calls,
      addSelect: query.addSelect.mock.calls,
    });
    expect(fields).not.toMatch(/password|token|login_code|r\.\*/);
  });

  it('combines company and search before paging, with stable ordering', async () => {
    const { service, query } = setup();
    await service.list('users', {
      empresaId: '7',
      search: " Escola' ",
      status: 'inactive',
      sort: 'asc',
      page: '2',
      pageSize: '50',
    });
    expect(query.andWhere).toHaveBeenCalledWith('r.empresa_id = :empresaId', {
      empresaId: 7,
    });
    expect(query.andWhere).toHaveBeenCalledWith('r.active = :active', {
      active: false,
    });
    expect(query.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('LIKE :search'),
      { search: "%Escola'%" },
    );
    expect(query.orderBy).toHaveBeenCalledWith('r.name', 'ASC');
    expect(query.addOrderBy).toHaveBeenCalledWith('r.id', 'DESC');
    expect(query.offset).toHaveBeenCalledWith(50);
  });

  it('caps each response at 100 records', async () => {
    const { service, query } = setup();
    await expect(
      service.list('invitations', { pageSize: '9999' }),
    ).resolves.toMatchObject({ pageSize: 100 });
    expect(query.limit).toHaveBeenCalledWith(100);
  });

  it.each(['nicknames', 'invitations', 'pilots', 'audit-events'])(
    'pages the %s list on the server',
    async (resource) => {
      const { service, query } = setup();
      await service.list(resource, { page: '2' });
      expect(query.offset).toHaveBeenCalledWith(25);
      expect(query.limit).toHaveBeenCalledWith(25);
    },
  );

  it('does not expose the before/after settings payload in the grid', async () => {
    const { service } = setup([
      { id: 1, previous: '{"feature":false}', current: '{"feature":true}' },
    ]);
    const result = await service.list('audit-settings', {});
    expect(result.items[0]).toEqual({
      id: 1,
      detail: '1 configurações atualizadas',
    });
  });

  it.each([
    { empresaId: 'bad' },
    { empresaId: '-1' },
    { page: '0' },
    { page: '1.5' },
    { page: '9007199254740992' },
    { search: [] },
  ])(
    'rejects invalid filters instead of broadening company scope: %j',
    async (filters) => {
      const { service, source } = setup();
      await expect(
        service.list('users', filters as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(source.getRepository).not.toHaveBeenCalled();
    },
  );

  it('rejects arbitrary resource names', async () => {
    const { service, source } = setup();
    await expect(service.list('constructor', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(source.getRepository).not.toHaveBeenCalled();
  });
});
