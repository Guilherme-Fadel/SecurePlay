import { QueryRunner } from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';
import { StartUserLevelAtZero1793491200001 } from './1793491200001-start-user-level-at-zero';

describe('level zero default', () => {
  it('initializes ORM-created accounts at zero', () => {
    expect(new Usuario().level).toBe(0);
  });
  it('changes only the SQL default and restores it on rollback', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const runner = { query } as unknown as QueryRunner;
    const migration = new StartUserLevelAtZero1793491200001();
    await migration.up(runner);
    await migration.down(runner);
    expect(query.mock.calls).toEqual([
      ['ALTER TABLE `usuario` ALTER COLUMN `level` SET DEFAULT 0'],
      ['ALTER TABLE `usuario` ALTER COLUMN `level` SET DEFAULT 1'],
    ]);
  });
});
