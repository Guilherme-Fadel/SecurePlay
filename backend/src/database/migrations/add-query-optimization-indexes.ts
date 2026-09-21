import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddQueryOptimizationIndexes1790035200000
  implements MigrationInterface
{
  private readonly indexes = [
    new TableIndex({
      name: 'ix_usuario_challenge_usuario_completed',
      tableName: 'usuario_challenge',
      columnNames: ['usuario_id', 'completed'],
    }),
    new TableIndex({
      name: 'ix_usuario_challenge_usuario_challenge',
      tableName: 'usuario_challenge',
      columnNames: ['usuario_id', 'challenge_id'],
    }),
    new TableIndex({
      name: 'ix_usuario_aula_usuario_completed',
      tableName: 'usuario_aula',
      columnNames: ['usuario_id', 'completed'],
    }),
    new TableIndex({
      name: 'ix_notification_usuario_created',
      tableName: 'notification',
      columnNames: ['usuario_id', 'created_at'],
    }),
    new TableIndex({
      name: 'ix_notification_usuario_read_created',
      tableName: 'notification',
      columnNames: ['usuario_id', 'readed', 'created_at'],
    }),
    new TableIndex({
      name: 'ix_question_challenge_order',
      tableName: 'question',
      columnNames: ['challenge_id', 'order'],
    }),
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const index of this.indexes) {
      const table = await queryRunner.getTable(index.tableName);
      if (table && !table.indices.some((item) => item.name === index.name)) {
        await queryRunner.createIndex(index.tableName, index);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of [...this.indexes].reverse()) {
      const table = await queryRunner.getTable(index.tableName);
      if (table?.indices.some((item) => item.name === index.name)) {
        await queryRunner.dropIndex(index.tableName, index.name);
      }
    }
  }
}
