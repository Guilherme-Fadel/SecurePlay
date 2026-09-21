import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddQueryOptimizationIndexes1790035200000
  implements MigrationInterface
{
  private readonly indexes = [
    {
      tableName: 'usuario_challenge',
      index: new TableIndex({
        name: 'ix_usuario_challenge_usuario_completed',
        columnNames: ['usuario_id', 'completed'],
      }),
    },
    {
      tableName: 'usuario_challenge',
      index: new TableIndex({
        name: 'ix_usuario_challenge_usuario_challenge',
        columnNames: ['usuario_id', 'challenge_id'],
      }),
    },
    {
      tableName: 'usuario_aula',
      index: new TableIndex({
        name: 'ix_usuario_aula_usuario_completed',
        columnNames: ['usuario_id', 'completed'],
      }),
    },
    {
      tableName: 'notification',
      index: new TableIndex({
        name: 'ix_notification_usuario_created',
        columnNames: ['usuario_id', 'created_at'],
      }),
    },
    {
      tableName: 'notification',
      index: new TableIndex({
        name: 'ix_notification_usuario_read_created',
        columnNames: ['usuario_id', 'readed', 'created_at'],
      }),
    },
    {
      tableName: 'question',
      index: new TableIndex({
        name: 'ix_question_challenge_order',
        columnNames: ['challenge_id', 'order'],
      }),
    },
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const { tableName, index } of this.indexes) {
      const table = await queryRunner.getTable(tableName);
      if (table && !table.indices.some((item) => item.name === index.name)) {
        await queryRunner.createIndex(tableName, index);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const { tableName, index } of [...this.indexes].reverse()) {
      const table = await queryRunner.getTable(tableName);
      if (table?.indices.some((item) => item.name === index.name)) {
        await queryRunner.dropIndex(tableName, index);
      }
    }
  }
}
