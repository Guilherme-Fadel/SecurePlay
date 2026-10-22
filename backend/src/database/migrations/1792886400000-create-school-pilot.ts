import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateSchoolPilot1792886400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('school_pilot')) return;

    await queryRunner.createTable(
      new Table({
        name: 'school_pilot',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'empresa_id', type: 'int' },
          { name: 'contact_admin_user_id', type: 'int', isNullable: true },
          { name: 'objective', type: 'varchar', length: '500' },
          { name: 'status', type: 'varchar', length: '20', default: "'planned'" },
          { name: 'start_date', type: 'date', isNullable: true },
          { name: 'agreed_end_date', type: 'date', isNullable: true },
          { name: 'next_weekly_meeting_at', type: 'datetime', isNullable: true },
          { name: 'next_action', type: 'varchar', length: '500', isNullable: true },
          { name: 'next_action_at', type: 'datetime', isNullable: true },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
        ],
        indices: [
          new TableIndex({
            name: 'ix_school_pilot_empresa_created',
            columnNames: ['empresa_id', 'created_at'],
          }),
        ],
        foreignKeys: [
          {
            name: 'FK_8401afa9d2049bbfb692112b2b4',
            columnNames: ['empresa_id'],
            referencedTableName: 'empresa',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
            onUpdate: 'NO ACTION',
          },
          {
            name: 'FK_34fbcb054c926bf2f33cb17f684',
            columnNames: ['contact_admin_user_id'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            onUpdate: 'NO ACTION',
          },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('school_pilot')) {
      await queryRunner.dropTable('school_pilot');
    }
  }
}
