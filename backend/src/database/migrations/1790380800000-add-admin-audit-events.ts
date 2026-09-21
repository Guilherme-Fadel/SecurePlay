import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddAdminAuditEvents1790380800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('admin_audit_event')) return;
    await queryRunner.createTable(new Table({
      name: 'admin_audit_event',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'empresa_id', type: 'int' },
        { name: 'ator_id', type: 'int' },
        { name: 'acao', type: 'varchar', length: '80' },
        { name: 'alvo_tipo', type: 'varchar', length: '40' },
        { name: 'alvo_id', type: 'int', isNullable: true },
        { name: 'detalhes', type: 'json', isNullable: true },
        { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
      ],
    }));
    await queryRunner.createIndex('admin_audit_event', new TableIndex({
      name: 'ix_admin_audit_event_empresa_created', columnNames: ['empresa_id', 'created_at'],
    }));
  }

  async down(): Promise<void> {
    throw new Error('A reversão automática não preserva eventos de auditoria.');
  }
}
