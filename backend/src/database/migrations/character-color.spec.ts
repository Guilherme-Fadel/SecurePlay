import { CharacterColor1794268800000 } from './1794268800000-character-color';

describe('Migração da cor base do personagem', () => {
  it('adiciona coluna anulável e remove somente ela no rollback', async () => {
    const hasColumn = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const addColumn = jest.fn().mockResolvedValue(undefined);
    const dropColumn = jest.fn().mockResolvedValue(undefined);
    const migration = new CharacterColor1794268800000();

    await migration.up({ hasColumn, addColumn } as never);
    expect(addColumn).toHaveBeenCalledWith(
      'usuario',
      expect.objectContaining({
        name: 'character_color',
        type: 'varchar',
        length: '16',
        isNullable: true,
        default: null,
      }),
    );
    await migration.down({ hasColumn, dropColumn } as never);
    expect(dropColumn).toHaveBeenCalledWith('usuario', 'character_color');
  });

  it('é idempotente quando a coluna já existe', async () => {
    const hasColumn = jest.fn().mockResolvedValue(true);
    const addColumn = jest.fn();
    await new CharacterColor1794268800000().up({
      hasColumn,
      addColumn,
    } as never);
    expect(addColumn).not.toHaveBeenCalled();
  });
});
