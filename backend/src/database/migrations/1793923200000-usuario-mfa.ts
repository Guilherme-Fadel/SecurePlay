import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * MFA por TOTP para gestão (A4/D2). Aditiva: três colunas nulas em `usuario`; a versão
 * publicada não as usa e continua funcionando.
 */
export class UsuarioMfa1793923200000 implements MigrationInterface {
  private readonly columns = [
    new TableColumn({
      name: 'mfa_secret_encrypted',
      type: 'varchar',
      length: '255',
      isNullable: true,
    }),
    new TableColumn({
      name: 'mfa_enabled_at',
      type: 'datetime',
      precision: 6,
      isNullable: true,
    }),
    new TableColumn({
      name: 'mfa_recovery_codes',
      type: 'json',
      isNullable: true,
    }),
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of this.columns) {
      if (!(await queryRunner.hasColumn('usuario', column.name)))
        await queryRunner.addColumn('usuario', column);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Perde os cadastros de MFA: as contas de gestão voltam a só senha.
    for (const column of this.columns) {
      if (await queryRunner.hasColumn('usuario', column.name))
        await queryRunner.dropColumn('usuario', column.name);
    }
  }
}
