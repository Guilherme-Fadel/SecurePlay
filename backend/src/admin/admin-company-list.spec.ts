import { AdminService } from './admin.service';

describe('AdminService.listarEmpresasPaginadas', () => {
  const empresas = [
    { id: 4, nome: 'Escola Azul', logo_url: null, paleta: null },
  ];
  const query = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([empresas, 31]),
  };
  const repository = { createQueryBuilder: jest.fn().mockReturnValue(query) };
  const service = new AdminService(repository as never, {} as never, {} as never, {} as never);

  beforeEach(() => jest.clearAllMocks());

  it('busca por nome e devolve apenas a pagina solicitada com total', async () => {
    await expect(service.listarEmpresasPaginadas({ page: 2, pageSize: 10, search: ' Escola ', sort: 'desc' }))
      .resolves.toEqual({ items: empresas, page: 2, pageSize: 10, total: 31, totalPages: 4 });
    expect(query.where).toHaveBeenCalledWith(
      'INSTR(LOWER(empresa.nome), LOWER(:search)) > 0',
      { search: 'Escola' },
    );
    expect(query.orderBy).toHaveBeenCalledWith('empresa.nome', 'DESC');
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.take).toHaveBeenCalledWith(10);
  });

  it('usa padrao seguro e limita tamanho de pagina', async () => {
    await expect(service.listarEmpresasPaginadas({ page: 0, pageSize: 500, search: ['unexpected'] as never, sort: 'invalid' as never }))
      .resolves.toMatchObject({ page: 1, pageSize: 100 });
    expect(query.where).not.toHaveBeenCalled();
    expect(query.orderBy).toHaveBeenCalledWith('empresa.nome', 'ASC');
    expect(query.take).toHaveBeenCalledWith(100);
  });
});
