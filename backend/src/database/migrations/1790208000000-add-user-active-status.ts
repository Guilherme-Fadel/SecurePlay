import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserActiveStatus1790208000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('usuario');
    if (table && !table.findColumnByName('active')) {
      await queryRunner.addColumn(
        'usuario',
        new TableColumn({
          name: 'active',
          type: 'tinyint',
          isNullable: false,
          default: '1',
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('usuario');
    if (table?.findColumnByName('active')) {
      await queryRunner.dropColumn('usuario', 'active');
    }
  }
}
