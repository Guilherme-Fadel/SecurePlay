import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class ArcadeRunCompletion1793318400000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasTable('activity_completion'))) {
      throw new Error(
        'Aplique a migração de conclusão de atividades antes da migração do arcade',
      );
    }
    if (!(await runner.hasTable('arcade_run')))
      await runner.createTable(
        new Table({
          name: 'arcade_run',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'run_id', type: 'varchar', length: '36' },
            { name: 'usuario_id', type: 'int' },
            { name: 'slug', type: 'varchar', length: '80' },
            { name: 'game_type', type: 'varchar', length: '24' },
            { name: 'xp_base', type: 'int' },
            { name: 'answer_key', type: 'json', isNullable: true },
            { name: 'correction', type: 'json', isNullable: true },
            { name: 'expires_at', type: 'datetime', precision: 6 },
            {
              name: 'submitted_at',
              type: 'datetime',
              precision: 6,
              isNullable: true,
            },
            { name: 'completed', type: 'tinyint', default: 0 },
            {
              name: 'created_at',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
            },
          ],
          indices: [
            {
              name: 'ux_arcade_run_uuid',
              columnNames: ['run_id'],
              isUnique: true,
            },
            {
              name: 'ix_arcade_run_pending',
              columnNames: ['completed', 'submitted_at'],
            },
            { name: 'ix_arcade_run_expiry', columnNames: ['expires_at'] },
          ],
          foreignKeys: [
            {
              name: 'fk_arcade_run_usuario',
              columnNames: ['usuario_id'],
              referencedTableName: 'usuario',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            },
          ],
        }),
      );
    if (!(await runner.hasTable('arcade_daily_plays')))
      await runner.createTable(
        new Table({
          name: 'arcade_daily_plays',
          columns: [
            { name: 'usuario_id', type: 'int', isPrimary: true },
            {
              name: 'game_slug',
              type: 'varchar',
              length: '80',
              isPrimary: true,
            },
            { name: 'day', type: 'date', isPrimary: true },
            { name: 'plays', type: 'int', default: 0 },
          ],
          foreignKeys: [
            {
              name: 'fk_arcade_daily_usuario',
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
    for (const table of ['arcade_daily_plays', 'arcade_run']) {
      if (await runner.hasTable(table)) {
        const rows: unknown = await runner.query(
          `SELECT 1 FROM ${table} LIMIT 1`,
        );
        if (!Array.isArray(rows) || rows.length)
          throw new Error(
            'Rollback bloqueado: preserve partidas, recibos e contadores antes de remover as tabelas do arcade',
          );
      }
    }
    for (const table of ['arcade_daily_plays', 'arcade_run']) {
      if (await runner.hasTable(table)) await runner.dropTable(table);
    }
  }
}
