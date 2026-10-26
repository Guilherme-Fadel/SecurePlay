import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class ActivityCompletion1793232000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    // MySQL confirma DDL implicitamente: validar legado antes de criar qualquer coisa.
    const duplicates: unknown = await runner.query(
      'SELECT 1 FROM usuario_challenge GROUP BY usuario_id, challenge_id HAVING COUNT(*) > 1 LIMIT 1',
    );
    if (!Array.isArray(duplicates) || duplicates.length) {
      throw new Error(
        'Migração bloqueada: existem missões duplicadas por usuário/desafio. Preserve e reconcilie os registros antes de reaplicar.',
      );
    }
    if (!(await runner.hasTable('activity_completion'))) {
      await runner.createTable(
        new Table({
          name: 'activity_completion',
          columns: [
            { name: 'id', type: 'varchar', length: '36', isPrimary: true },
            { name: 'usuario_id', type: 'int' },
            { name: 'activity_type', type: 'varchar', length: '16' },
            { name: 'activity_id', type: 'int' },
            { name: 'result', type: 'json' },
            { name: 'xp', type: 'int', default: 0 },
            { name: 'previous_points', type: 'int', default: 0 },
            { name: 'notifications', type: 'json', isNullable: true },
            { name: 'effects_processed', type: 'tinyint', default: 0 },
            {
              name: 'created_at',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
            },
          ],
          indices: [
            {
              name: 'ux_activity_completion_source',
              columnNames: ['usuario_id', 'activity_type', 'activity_id'],
              isUnique: true,
            },
            {
              name: 'ix_activity_completion_pending',
              columnNames: ['effects_processed', 'created_at'],
            },
          ],
          foreignKeys: [
            {
              name: 'fk_activity_completion_usuario',
              columnNames: ['usuario_id'],
              referencedTableName: 'usuario',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            },
          ],
        }),
      );
    }
    const challenge = await runner.getTable('usuario_challenge');
    if (
      !challenge?.indices.some(
        (index) => index.name === 'ux_usuario_challenge_source',
      )
    ) {
      await runner.createIndex(
        'usuario_challenge',
        new TableIndex({
          name: 'ux_usuario_challenge_source',
          columnNames: ['usuario_id', 'challenge_id'],
          isUnique: true,
        }),
      );
    }
  }

  async down(runner: QueryRunner): Promise<void> {
    if (await runner.hasTable('activity_completion')) {
      const records: unknown = await runner.query(
        'SELECT 1 FROM activity_completion LIMIT 1',
      );
      if (!Array.isArray(records) || records.length)
        throw new Error(
          'Rollback bloqueado: preserve os resultados e efeitos de atividades antes de remover a tabela.',
        );
      await runner.dropTable('activity_completion');
    }
    const challenge = await runner.getTable('usuario_challenge');
    if (
      challenge?.indices.some(
        (index) => index.name === 'ux_usuario_challenge_source',
      )
    ) {
      await runner.dropIndex(
        'usuario_challenge',
        'ux_usuario_challenge_source',
      );
    }
  }
}
