import {
  MigrationInterface,
  QueryRunner,
  TableForeignKey,
} from 'typeorm';

export class AddAdminAuditActorForeignKey1792627200000
  implements MigrationInterface
{
  private readonly foreignKeyName = 'FK_4e0eb7d0dc33b28eaa566271b77';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('admin_audit_event');
    if (!table) {
      throw new Error('Tabela admin_audit_event não encontrada');
    }

    const matchingForeignKey = table.foreignKeys.find(
      (foreignKey) =>
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === 'ator_id' &&
        foreignKey.referencedTableName === 'usuario' &&
        foreignKey.referencedColumnNames.length === 1 &&
        foreignKey.referencedColumnNames[0] === 'id',
    );
    if (matchingForeignKey?.name === this.foreignKeyName) return;
    if (matchingForeignKey) {
      throw new Error(
        'A FK de admin_audit_event.ator_id existe com nome divergente; reconcilie antes da migration',
      );
    }

    await queryRunner.createForeignKey(
      'admin_audit_event',
      new TableForeignKey({
        name: this.foreignKeyName,
        columnNames: ['ator_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('admin_audit_event');
    if (!table) return;

    const foreignKey = table.foreignKeys.find(
      (candidate) => candidate.name === this.foreignKeyName,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('admin_audit_event', foreignKey);
    }
  }
}
