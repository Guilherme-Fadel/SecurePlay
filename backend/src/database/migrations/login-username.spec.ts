import { Table, TableColumn, TableIndex } from 'typeorm';
import { AddLoginUsername1792972800000 } from './1792972800000-add-login-username';

function setup() {
  const tables = Object.fromEntries(
    ['usuario', 'pending_registration'].map((name) => [
      name,
      new Table({
        name,
        columns: [
          { name: 'id', type: 'int' },
          ...(name === 'pending_registration'
            ? [{ name: 'birth_date', type: 'date' }]
            : []),
        ],
      }),
    ]),
  );
  const runner = {
    hasColumn: jest.fn((table: string, column: string) =>
      Promise.resolve(Boolean(tables[table].findColumnByName(column))),
    ),
    getTable: jest.fn((table: string) => Promise.resolve(tables[table])),
    addColumn: jest.fn((table: string, column: TableColumn) => {
      tables[table].columns.push(column);
      return Promise.resolve();
    }),
    changeColumn: jest.fn(
      (table: string, old: TableColumn, next: TableColumn) => {
        tables[table].columns[tables[table].columns.indexOf(old)] = next;
        return Promise.resolve();
      },
    ),
    createIndex: jest.fn((table: string, index: TableIndex) => {
      tables[table].indices.push(index);
      return Promise.resolve();
    }),
    dropIndex: jest.fn((table: string, name: string) => {
      tables[table].indices = tables[table].indices.filter(
        (index) => index.name !== name,
      );
      return Promise.resolve();
    }),
    dropColumn: jest.fn((table: string, name: string) => {
      tables[table].columns = tables[table].columns.filter(
        (column) => column.name !== name,
      );
      return Promise.resolve();
    }),
    query: jest.fn().mockResolvedValue([{ total: 0 }]),
  };
  return { runner, tables, migration: new AddLoginUsername1792972800000() };
}

describe('Migração aditiva de identificador de login', () => {
  it('preserva legados, cria unicidade global sem empresa e permite up/down/up vazio', async () => {
    const { runner, tables, migration } = setup();
    await migration.up(runner as never);
    expect(tables.usuario.findColumnByName('username')).toMatchObject({
      isNullable: true,
      length: '24',
      charset: 'ascii',
      collation: 'ascii_general_ci',
    });
    expect(tables.usuario.indices).toEqual([
      expect.objectContaining({ isUnique: true, columnNames: ['username'] }),
    ]);
    expect(
      tables.pending_registration.findColumnByName('birth_date')?.isNullable,
    ).toBe(true);
    expect(runner.query).not.toHaveBeenCalled(); // No rewriting existing rows.
    await migration.up(runner as never);
    expect(runner.createIndex).toHaveBeenCalledTimes(1);
    await migration.down(runner as never);
    expect(tables.usuario.findColumnByName('username')).toBeUndefined();
    expect(
      tables.pending_registration.findColumnByName('birth_date')?.isNullable,
    ).toBe(false);
    await migration.up(runner as never);
    expect(tables.usuario.findColumnByName('phone')?.isNullable).toBe(true);
  });
  it('bloqueia rollback antes de remover qualquer coluna quando existem novos dados', async () => {
    const { runner, migration } = setup();
    await migration.up(runner as never);
    runner.changeColumn.mockClear();
    runner.query.mockResolvedValue([{ total: 1 }]);
    await expect(migration.down(runner as never)).rejects.toThrow(
      'Rollback bloqueado',
    );
    expect(runner.dropColumn).not.toHaveBeenCalled();
    expect(runner.changeColumn).not.toHaveBeenCalled();
  });
});
