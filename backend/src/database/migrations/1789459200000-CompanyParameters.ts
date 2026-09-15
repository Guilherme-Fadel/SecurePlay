import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class CompanyParameters1789459200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasColumn('empresa', 'parametros_funcionalidades'))
    ) {
      await queryRunner.addColumn(
        'empresa',
        new TableColumn({
          name: 'parametros_funcionalidades',
          type: 'json',
          isNullable: true,
        }),
      );
    }
    if (!(await queryRunner.hasTable('empresa_parametros_audit'))) {
      await queryRunner.createTable(
        new Table({
          name: 'empresa_parametros_audit',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'empresa_id', type: 'int' },
            { name: 'alterado_por_id', type: 'int' },
            { name: 'anterior', type: 'json' },
            { name: 'atual', type: 'json' },
            {
              name: 'created_at',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
            },
          ],
          indices: [
            new TableIndex({
              name: 'ix_empresa_parametros_empresa_data',
              columnNames: ['empresa_id', 'created_at'],
            }),
          ],
        }),
      );
    }
  }

  async down(): Promise<void> {
    throw new Error(
      'Reversão automática desabilitada para preservar parâmetros e histórico. Planeje uma reversão com backup.',
    );
  }
}
