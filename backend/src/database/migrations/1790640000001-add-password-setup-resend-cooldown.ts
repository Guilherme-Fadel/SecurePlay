import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPasswordSetupResendCooldown1790640000001
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('usuario', 'password_setup_last_sent_at'))) {
      await queryRunner.addColumn('usuario', new TableColumn({
        name: 'password_setup_last_sent_at',
        type: 'datetime',
        isNullable: true,
      }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('usuario', 'password_setup_last_sent_at')) {
      await queryRunner.dropColumn('usuario', 'password_setup_last_sent_at');
    }
  }
}
