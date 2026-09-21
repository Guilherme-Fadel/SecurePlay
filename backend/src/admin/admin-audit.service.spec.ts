import { AdminService } from './admin.service';

describe('AdminService.listarAuditoriaDaEmpresa', () => {
  it('pagina o histórico e expõe o responsável sem carregar dados desnecessários', async () => {
    const repository = {
      findAndCount: jest.fn().mockResolvedValue([
        [{
          id: 8,
          created_at: new Date('2026-09-21T12:00:00.000Z'),
          alterado_por_id: 3,
          anterior: { rankingEnabled: false },
          atual: { rankingEnabled: true },
        }],
        1,
      ]),
    };
    const service = new AdminService(
      {} as never,
      { find: jest.fn().mockResolvedValue([{ id: 3, name: 'Admin', email: 'admin@secureplay.test' }]) } as never,
      { getRepository: jest.fn().mockReturnValue(repository) } as never,
      {} as never,
    );

    await expect(service.listarAuditoriaDaEmpresa(4, { page: 1, pageSize: 25 })).resolves.toEqual({
      items: [{
        id: 8,
        created_at: new Date('2026-09-21T12:00:00.000Z'),
        alterado_por: { id: 3, name: 'Admin', email: 'admin@secureplay.test' },
        configuracoes_alteradas: 1,
      }],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    });
    expect(repository.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresa_id: 4 },
      skip: 0,
      take: 25,
    }));
  });
});
