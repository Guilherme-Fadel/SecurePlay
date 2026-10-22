import { AddUserSessionVersion1792713600000 } from './1792713600000-add-user-session-version';

describe('Migração de versão da sessão de usuário', () => {
  it('adiciona coluna com versão zero e remove somente essa coluna no rollback', async () => {
    const hasColumn = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const addColumn = jest.fn().mockResolvedValue(undefined);
    const dropColumn = jest.fn().mockResolvedValue(undefined);
    const migration = new AddUserSessionVersion1792713600000();

    await migration.up({ hasColumn, addColumn } as never);
    expect(addColumn).toHaveBeenCalledWith(
      'usuario',
      expect.objectContaining({ name: 'session_version', type: 'int', default: 0 }),
    );
    await migration.down({ hasColumn, dropColumn } as never);
    expect(dropColumn).toHaveBeenCalledWith('usuario', 'session_version');
  });
});
