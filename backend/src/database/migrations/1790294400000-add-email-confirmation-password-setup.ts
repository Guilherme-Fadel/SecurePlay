import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailConfirmationPasswordSetup1790294400000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      new TableColumn({ name: 'email_verification_required', type: 'tinyint', default: '0' }),
      new TableColumn({ name: 'email_verification_token_hash', type: 'varchar', length: '64', isNullable: true }),
      new TableColumn({ name: 'email_verification_expires_at', type: 'datetime', isNullable: true }),
      new TableColumn({ name: 'password_change_required', type: 'tinyint', default: '0' }),
      new TableColumn({ name: 'password_setup_token_hash', type: 'varchar', length: '64', isNullable: true }),
      new TableColumn({ name: 'password_setup_expires_at', type: 'datetime', isNullable: true }),
    ];
    for (const column of columns) {
      if (!(await queryRunner.hasColumn('usuario', column.name))) {
        await queryRunner.addColumn('usuario', column);
      }
    }
  }

  async down(): Promise<void> {
    throw new Error('A reversão automática não preserva tokens de acesso com segurança.');
  }
}
