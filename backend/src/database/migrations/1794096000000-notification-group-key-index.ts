import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Índice não único por `group_key`: o resumo de apelidos e a limpeza por chave
 * filtram por `group_key` sem conhecer o usuário primeiro (o único composto
 * começa por `usuario_id`). Aditiva e reversível.
 */
export class NotificationGroupKeyIndex1794096000000 implements MigrationInterface {
  private readonly indexName = 'ix_notification_group_key';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('notification');
    if (table?.indices.some((index) => index.name === this.indexName)) return;
    await queryRunner.createIndex(
      'notification',
      new TableIndex({ name: this.indexName, columnNames: ['group_key'] }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('notification');
    if (table?.indices.some((index) => index.name === this.indexName))
      await queryRunner.dropIndex('notification', this.indexName);
  }
}
