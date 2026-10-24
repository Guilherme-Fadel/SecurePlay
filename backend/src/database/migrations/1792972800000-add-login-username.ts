import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddLoginUsername1792972800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['usuario', 'pending_registration']) {
      if (!(await queryRunner.hasColumn(table, 'username'))) {
        await queryRunner.addColumn(
          table,
          new TableColumn({
            name: 'username',
            type: 'varchar',
            length: '24',
            isNullable: true,
            charset: 'ascii',
            collation: 'ascii_general_ci',
          }),
        );
      }
      if (!(await queryRunner.hasColumn(table, 'phone'))) {
        await queryRunner.addColumn(
          table,
          new TableColumn({
            name: 'phone',
            type: 'varchar',
            length: '16',
            isNullable: true,
          }),
        );
      }
    }
    const users = await queryRunner.getTable('usuario');
    if (!users) throw new Error('Tabela usuario não encontrada');
    if (!users.indices.some((index) => index.name === 'ux_usuario_username')) {
      await queryRunner.createIndex(
        'usuario',
        new TableIndex({
          name: 'ux_usuario_username',
          columnNames: ['username'],
          isUnique: true,
        }),
      );
    }
    const pending = await queryRunner.getTable('pending_registration');
    const birthDate = pending?.findColumnByName('birth_date');
    if (birthDate && !birthDate.isNullable) {
      await queryRunner.changeColumn(
        'pending_registration',
        birthDate,
        new TableColumn({ ...birthDate, isNullable: true }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback must not destroy identifiers, contact data or pending registrations.
    for (const table of ['usuario', 'pending_registration']) {
      const conditions: string[] = [];
      if (await queryRunner.hasColumn(table, 'username'))
        conditions.push('username IS NOT NULL');
      if (await queryRunner.hasColumn(table, 'phone'))
        conditions.push('phone IS NOT NULL');
      if (table === 'pending_registration')
        conditions.push('birth_date IS NULL');
      if (conditions.length) {
        const rows = (await queryRunner.query(
          `SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${conditions.join(' OR ')}`,
        )) as { total: string | number }[];
        if (Number(rows[0].total) > 0)
          throw new Error(
            'Rollback bloqueado: preserve ou migre os novos usuários, telefones e cadastros pendentes antes de remover o schema.',
          );
      }
    }
    const pending = await queryRunner.getTable('pending_registration');
    const birthDate = pending?.findColumnByName('birth_date');
    if (birthDate?.isNullable)
      await queryRunner.changeColumn(
        'pending_registration',
        birthDate,
        new TableColumn({ ...birthDate, isNullable: false }),
      );
    const users = await queryRunner.getTable('usuario');
    if (users?.indices.some((index) => index.name === 'ux_usuario_username'))
      await queryRunner.dropIndex('usuario', 'ux_usuario_username');
    for (const table of ['pending_registration', 'usuario']) {
      for (const column of ['phone', 'username']) {
        if (await queryRunner.hasColumn(table, column))
          await queryRunner.dropColumn(table, column);
      }
    }
  }
}
