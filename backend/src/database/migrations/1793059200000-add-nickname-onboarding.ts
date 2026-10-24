import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNicknameOnboarding1793059200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasColumn('usuario', 'nickname_onboarding_pending'))
    ) {
      await queryRunner.addColumn(
        'usuario',
        new TableColumn({
          name: 'nickname_onboarding_pending',
          type: 'tinyint',
          default: 0,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('usuario', 'nickname_onboarding_pending')) {
      // Reverting removes only the optional welcome prompt, not nickname requests.
      await queryRunner.dropColumn('usuario', 'nickname_onboarding_pending');
    }
  }
}
