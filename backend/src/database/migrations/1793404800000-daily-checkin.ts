import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class DailyCheckin1793404800000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasTable('activity_completion')))
      throw new Error('Aplique a migração de conclusão antes do check-in');
    if (await runner.hasTable('daily_checkin')) return;
    await runner.createTable(
      new Table({
        name: 'daily_checkin',
        columns: [
          { name: 'usuario_id', type: 'int', isPrimary: true },
          { name: 'day', type: 'date', isPrimary: true },
          { name: 'streak', type: 'int' },
          { name: 'bonus_xp', type: 'int' },
          { name: 'refill_status', type: 'varchar', length: '8' },
          {
            name: 'refill_started_at',
            type: 'datetime',
            precision: 6,
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            name: 'fk_checkin_usuario',
            columnNames: ['usuario_id'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasTable('daily_checkin'))) return;
    const rows: unknown = await runner.query(
      'SELECT 1 FROM daily_checkin LIMIT 1',
    );
    if (!Array.isArray(rows) || rows.length)
      throw new Error(
        'Rollback bloqueado: preserve check-ins e estados de reposição',
      );
    const completions: unknown = await runner.query(
      "SELECT 1 FROM activity_completion WHERE activity_type = 'checkin' LIMIT 1",
    );
    if (!Array.isArray(completions) || completions.length)
      throw new Error('Rollback bloqueado: existem conclusões de check-in');
    await runner.dropTable('daily_checkin');
  }
}
