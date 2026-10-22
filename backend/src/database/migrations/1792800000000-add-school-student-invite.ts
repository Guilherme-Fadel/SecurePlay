import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddSchoolStudentInvite1792800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const userTable = await queryRunner.getTable('usuario');
    if (!userTable) throw new Error('Tabela usuario não encontrada');

    const emailColumn = userTable.findColumnByName('email');
    if (emailColumn && !emailColumn.isNullable) {
      await queryRunner.changeColumn(
        'usuario',
        emailColumn,
        new TableColumn({ ...emailColumn, isNullable: true }),
      );
    }

    if (!(await queryRunner.hasColumn('usuario', 'login_code'))) {
      await queryRunner.addColumn(
        'usuario',
        new TableColumn({
          name: 'login_code',
          type: 'varchar',
          length: '20',
          isNullable: true,
        }),
      );
    }
    if (!userTable.indices.some((index) => index.name === 'ux_usuario_login_code')) {
      await queryRunner.createIndex(
        'usuario',
        new TableIndex({
          name: 'ux_usuario_login_code',
          columnNames: ['login_code'],
          isUnique: true,
        }),
      );
    }
    if (!(await queryRunner.hasColumn('usuario', 'password_reset_token_hash'))) {
      await queryRunner.addColumn(
        'usuario',
        new TableColumn({
          name: 'password_reset_token_hash',
          type: 'varchar',
          length: '64',
          isNullable: true,
        }),
      );
    }
    if (!(await queryRunner.hasColumn('usuario', 'password_reset_expires_at'))) {
      await queryRunner.addColumn(
        'usuario',
        new TableColumn({
          name: 'password_reset_expires_at',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn('convite', 'registration_mode'))) {
      await queryRunner.addColumn(
        'convite',
        new TableColumn({
          name: 'registration_mode',
          type: 'varchar',
          length: '24',
          default: "'legacy_email'",
          isNullable: false,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const userTableBeforeRollback = await queryRunner.getTable('usuario');
    const emailBeforeRollback = userTableBeforeRollback?.findColumnByName('email');
    if (emailBeforeRollback?.isNullable) {
      const [{ total }] = await queryRunner.query(
        'SELECT COUNT(*) AS total FROM usuario WHERE email IS NULL',
      );
      if (Number(total) > 0) {
        throw new Error(
          'Rollback interrompido: existem usuários sem e-mail; preserve os registros e reative o fluxo anterior antes de tornar email obrigatório.',
        );
      }
    }

    if (await queryRunner.hasColumn('convite', 'registration_mode')) {
      await queryRunner.dropColumn('convite', 'registration_mode');
    }

    const userTable = await queryRunner.getTable('usuario');
    if (!userTable) return;
    if (userTable.findColumnByName('password_reset_token_hash')) {
      await queryRunner.dropColumn('usuario', 'password_reset_token_hash');
    }
    if (userTable.findColumnByName('password_reset_expires_at')) {
      await queryRunner.dropColumn('usuario', 'password_reset_expires_at');
    }
    const loginCodeIndex = userTable.indices.find(
      (index) => index.name === 'ux_usuario_login_code',
    );
    if (loginCodeIndex) await queryRunner.dropIndex('usuario', loginCodeIndex);
    if (userTable.findColumnByName('login_code')) {
      await queryRunner.dropColumn('usuario', 'login_code');
    }

    const emailColumn = userTable.findColumnByName('email');
    if (emailColumn?.isNullable) {
      await queryRunner.changeColumn(
        'usuario',
        emailColumn,
        new TableColumn({ ...emailColumn, isNullable: false }),
      );
    }
  }
}
