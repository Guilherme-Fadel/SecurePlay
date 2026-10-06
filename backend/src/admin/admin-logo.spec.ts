import { AdminService } from './admin.service';

jest.mock('../dashboard/ranking-history', () => ({
  ...jest.requireActual('../dashboard/ranking-history'),
  ensurePendingRankingSeasonsClosed: jest.fn().mockResolvedValue(undefined),
}));

describe('Logo da empresa no tema', () => {
  const firstKey = 'empresas/4/logo-1234567890abcdef12345678.webp';
  const replacementKey = 'empresas/4/logo-abcdef1234567890abcdef12.png';
  const otherCompanyKey = 'empresas/5/logo-1234567890abcdef12345678.webp';

  it('separa chave persistida da URL de visualização ao carregar e substituir', async () => {
    const empresa = { id: 4, nome: 'Empresa teste', logo_url: firstKey, paleta: null };
    const repository = {
      findOne: jest.fn().mockResolvedValue(empresa),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const s3 = {
      resolveCompanyLogoUrl: jest.fn(async (_id, key) => `https://signed.example/${key}`),
    };
    const service = new AdminService(repository as never, {} as never, {} as never, s3 as never);

    await expect(service.getTemaDaEmpresa(4)).resolves.toMatchObject({
      logo_url: firstKey,
      logo_preview_url: `https://signed.example/${firstKey}`,
    });
    await expect(service.updateTemaDaEmpresa(4, { logo_url: replacementKey }))
      .resolves.toMatchObject({
        logo_url: replacementKey,
        logo_preview_url: `https://signed.example/${replacementKey}`,
      });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ logo_url: replacementKey }),
    );
    expect(s3.resolveCompanyLogoUrl).toHaveBeenLastCalledWith(4, replacementKey);
  });

  it('recusa salvar a chave de outra empresa', async () => {
    const repository = {
      findOne: jest.fn().mockResolvedValue({ id: 4, logo_url: firstKey }),
      save: jest.fn(),
    };
    const service = new AdminService(repository as never, {} as never, {} as never, {} as never);
    await expect(service.updateTemaDaEmpresa(4, { logo_url: otherCompanyKey }))
      .rejects.toThrow('Logo não pertence à empresa');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('remove a associação da logo sem apagar outros dados da empresa', async () => {
    const empresa = { id: 4, nome: 'Empresa teste', logo_url: firstKey, paleta: null };
    const repository = {
      findOne: jest.fn().mockResolvedValue(empresa),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const s3 = { resolveCompanyLogoUrl: jest.fn() };
    const service = new AdminService(repository as never, {} as never, {} as never, s3 as never);
    await expect(service.updateTemaDaEmpresa(4, { logo_url: null }))
      .resolves.toMatchObject({ nome: 'Empresa teste', logo_url: null, logo_preview_url: null });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ logo_url: null }));
    expect(s3.resolveCompanyLogoUrl).not.toHaveBeenCalled();
  });

  it('remove a logo também pelo salvamento integrado da plataforma', async () => {
    const empresa = { id: 4, nome: 'Empresa teste', logo_url: firstKey, paleta: null };
    const manager = {
      findOne: jest.fn().mockResolvedValue(empresa),
      save: jest.fn().mockImplementation(async (_entity, value) => value),
    };
    const service = new AdminService(
      {} as never,
      {} as never,
      { transaction: async (callback) => callback(manager) } as never,
      {} as never,
    );
    await expect(service.updateConfiguracoesDaEmpresa(4, 9, { logo_url: null }))
      .resolves.toMatchObject({ tema: { logo_url: null, logo_preview_url: null } });
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ logo_url: null }));
  });
});
