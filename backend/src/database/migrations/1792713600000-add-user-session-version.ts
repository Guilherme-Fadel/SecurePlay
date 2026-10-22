import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddUserSessionVersion1792713600000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('usuario', 'session_version')) return;

    await queryRunner.addColumn(
      'usuario',
      new TableColumn({
        name: 'session_version',
        type: 'int',
        default: 0,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('usuario', 'session_version'))) return;
    await queryRunner.dropColumn('usuario', 'session_version');
  }
}
