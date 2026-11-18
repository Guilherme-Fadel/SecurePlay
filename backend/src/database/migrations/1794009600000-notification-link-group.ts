import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * Notificações v2: link interno, chave de agrupamento/dedupe e tipos fechados.
 * Aditiva: duas colunas nulas e um índice único (NULLs não conflitam no MySQL).
 * A normalização de `type` converte valores antigos e não é desfeita no `down`.
 */
export class NotificationLinkGroup1794009600000 implements MigrationInterface {
  private readonly indexName = 'uq_notification_usuario_group';
  private readonly columns = [
    new TableColumn({
      name: 'link',
      type: 'varchar',
      length: '200',
      isNullable: true,
    }),
    new TableColumn({
      name: 'group_key',
      type: 'varchar',
      length: '120',
      isNullable: true,
    }),
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of this.columns) {
      if (!(await queryRunner.hasColumn('notification', column.name)))
        await queryRunner.addColumn('notification', column);
    }

    const table = await queryRunner.getTable('notification');
    if (!table?.indices.some((index) => index.name === this.indexName)) {
      await queryRunner.createIndex(
        'notification',
        new TableIndex({
          name: this.indexName,
          columnNames: ['usuario_id', 'group_key'],
          isUnique: true,
        }),
      );
    }

    await queryRunner.query(
      "UPDATE `notification` SET `type` = 'progresso' WHERE `type` = 'achievement'",
    );
    await queryRunner.query(
      "UPDATE `notification` SET `type` = 'aviso' WHERE `type` NOT IN ('conquista','progresso','ranking','turma','gestao','seguranca','aviso')",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Os tipos normalizados não voltam aos valores antigos (perda aceita).
    const table = await queryRunner.getTable('notification');
    if (table?.indices.some((index) => index.name === this.indexName))
      await queryRunner.dropIndex('notification', this.indexName);
    for (const column of this.columns) {
      if (await queryRunner.hasColumn('notification', column.name))
        await queryRunner.dropColumn('notification', column.name);
    }
  }
}
