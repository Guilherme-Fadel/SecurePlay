import { NotFoundException } from '@nestjs/common';
import { ConvitesService } from './convites.service';

describe('Administrative user detail', () => {
  function setup(record: Record<string, unknown> | null) {
    const repository = { findOne: jest.fn().mockResolvedValue(record) };
    const service = new ConvitesService(
      {} as never,
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, repository };
  }

  it('restricts lookup to the requested company and returns only public administrative fields', async () => {
    const { service, repository } = setup({
      id: 4,
      empresa_id: 2,
      name: 'Aluno',
      password: 'private',
      login_code: 'private-code',
    });
    const result = await service.obterUsuarioDaEmpresa(2, 4);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 4, empresa_id: 2 },
    });
    expect(result).toMatchObject({
      id: 4,
      name: 'Aluno',
      login_method: 'school_code',
    });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('login_code');
  });

  it('does not fall back to a global lookup when a user is absent from the company', async () => {
    const { service, repository } = setup(null);
    await expect(service.obterUsuarioDaEmpresa(2, 4)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findOne).toHaveBeenCalledTimes(1);
  });
});
