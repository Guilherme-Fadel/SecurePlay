import { CompanyParameters1789459200000 } from './1789459200000-CompanyParameters';

describe('Migration de parâmetros da empresa', () => {
  it('adiciona apenas os objetos necessários sem reescrever registros existentes', async () => {
    const runner = {
      hasColumn: async () => false,
      hasTable: async () => false,
      addColumn: jest.fn(),
      createTable: jest.fn(),
    };
    await new CompanyParameters1789459200000().up(runner as never);
    expect(runner.addColumn).toHaveBeenCalledWith(
      'empresa',
      expect.objectContaining({
        name: 'parametros_funcionalidades',
        isNullable: true,
      }),
    );
    expect(runner.createTable).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'empresa_parametros_audit' }),
    );
  });

  it('permite aplicar em um schema já sincronizado sem recriar objetos', async () => {
    const runner = {
      hasColumn: async () => true,
      hasTable: async () => true,
      addColumn: jest.fn(),
      createTable: jest.fn(),
    };
    await new CompanyParameters1789459200000().up(runner as never);
    expect(runner.addColumn).not.toHaveBeenCalled();
    expect(runner.createTable).not.toHaveBeenCalled();
  });
});
