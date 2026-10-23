import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SchoolPilotService } from './school-pilot.service';
import { Role } from '../auth/roles.enum';

describe('School pilot bounded queries', () => {
  function harness() {
    const query: Record<string, jest.Mock> = {};
    for (const method of [
      'select',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ])
      query[method] = jest.fn().mockReturnValue(query);
    query.getManyAndCount = jest.fn().mockResolvedValue([[], 51]);
    const repository = {
      findOne: jest.fn().mockResolvedValue(null),
      findAndCount: jest.fn().mockResolvedValue([[], 51]),
      createQueryBuilder: jest.fn().mockReturnValue(query),
    };
    const source = {
      getRepository: () => repository,
      manager: { findOne: jest.fn().mockResolvedValue({ id: 20 }) },
    };
    return {
      service: new SchoolPilotService(source as unknown as DataSource),
      repository,
      query,
    };
  }

  it('scopes individual lookup to both pilot and company without loading a list', async () => {
    const { service, repository } = harness();
    await expect(service.detail(20, 31)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 31, empresa_id: 20 },
      relations: ['contact_admin'],
    });
    expect(repository.findAndCount).not.toHaveBeenCalled();
  });
  it('rejects offsets outside safe integer bounds and non-text searches', async () => {
    const { service } = harness();
    await expect(
      service.listPage(20, Number.MAX_SAFE_INTEGER),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.contacts(20, '', Number.MAX_SAFE_INTEGER),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.contacts(20, [] as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('paginates the company list in the database with stable ordering', async () => {
    const { service, repository } = harness();
    expect(await service.listPage(20, 3)).toMatchObject({
      total: 51,
      totalPages: 3,
    });
    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { empresa_id: 20 },
        skip: 50,
        take: 25,
        order: { created_at: 'DESC', id: 'DESC' },
      }),
    );
    await service.listPage(20, NaN);
    expect(repository.findAndCount).toHaveBeenLastCalledWith(
      expect.objectContaining({ skip: 0, take: 25 }),
    );
  });

  it('searches contacts by company and admin role with a bounded public projection', async () => {
    const { service, query } = harness();
    await service.contacts(20, ' Escola ', 2);
    expect(query.select).toHaveBeenCalledWith([
      'contact.id',
      'contact.name',
      'contact.email',
      'contact.active',
    ]);
    expect(query.where).toHaveBeenCalledWith(
      'contact.empresa_id = :empresaId',
      { empresaId: 20 },
    );
    expect(query.andWhere).toHaveBeenCalledWith('contact.role = :role', {
      role: Role.ADMIN,
    });
    expect(query.andWhere).toHaveBeenCalledWith(
      '(LOWER(contact.name) LIKE :search OR LOWER(contact.email) LIKE :search)',
      { search: '%escola%' },
    );
    expect(query.skip).toHaveBeenCalledWith(25);
    expect(query.take).toHaveBeenCalledWith(25);
  });
});
