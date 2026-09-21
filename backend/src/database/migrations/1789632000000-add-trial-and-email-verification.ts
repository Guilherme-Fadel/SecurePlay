import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class TrialAndEmailVerification1789632000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const userColumns = [
      new TableColumn({ name: 'birth_date', type: 'date', isNullable: true }),
      new TableColumn({
        name: 'email_verified_at',
        type: 'datetime',
        isNullable: true,
      }),
      new TableColumn({
        name: 'trial_started_at',
        type: 'datetime',
        isNullable: true,
      }),
      new TableColumn({
        name: 'trial_ends_at',
        type: 'datetime',
        isNullable: true,
      }),
    ];
    for (const column of userColumns) {
      if (!(await queryRunner.hasColumn('usuario', column.name))) {
        await queryRunner.addColumn('usuario', column);
      }
    }
    if (!(await queryRunner.hasTable('pending_registration'))) {
      await queryRunner.createTable(
        new Table({
          name: 'pending_registration',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'token_hash', type: 'varchar', length: '64' },
            { name: 'email', type: 'varchar', length: '100' },
            { name: 'name', type: 'varchar', length: '100' },
            { name: 'birth_date', type: 'date' },
            {
              name: 'nickname',
              type: 'varchar',
              length: '24',
              isNullable: true,
            },
            { name: 'kind', type: 'varchar', length: '16' },
            { name: 'invite_id', type: 'int', isNullable: true },
            { name: 'expires_at', type: 'datetime' },
            { name: 'last_sent_at', type: 'datetime', isNullable: true },
            {
              name: 'created_at',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
            },
          ],
          indices: [
            new TableIndex({
              name: 'ux_pending_registration_token',
              columnNames: ['token_hash'],
              isUnique: true,
            }),
            new TableIndex({
              name: 'ux_pending_registration_email',
              columnNames: ['email'],
              isUnique: true,
            }),
          ],
        }),
      );
    }
    if (
      !(await queryRunner.hasColumn('pending_registration', 'last_sent_at'))
    ) {
      await queryRunner.addColumn(
        'pending_registration',
        new TableColumn({
          name: 'last_sent_at',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }
    const usuarioTable = await queryRunner.getTable('usuario');
    if (
      !usuarioTable?.indices.some((index) => index.name === 'ux_usuario_email')
    ) {
      const duplicateEmails = (await queryRunner.query(
        'SELECT LOWER(email) AS email FROM usuario GROUP BY LOWER(email) HAVING COUNT(*) > 1 LIMIT 1',
      )) as unknown[];
      if (duplicateEmails.length)
        throw new Error(
          'Existem e-mails duplicados em usuario. Resolva antes da migração.',
        );
      await queryRunner.createIndex(
        'usuario',
        new TableIndex({
          name: 'ux_usuario_email',
          columnNames: ['email'],
          isUnique: true,
        }),
      );
    }
    if (!(await queryRunner.hasColumn('empresa', 'system_key'))) {
      await queryRunner.addColumn(
        'empresa',
        new TableColumn({
          name: 'system_key',
          type: 'varchar',
          length: '32',
          isNullable: true,
        }),
      );
    }
    const empresaTable = await queryRunner.getTable('empresa');
    if (
      !empresaTable?.indices.some(
        (index) => index.name === 'ux_empresa_system_key',
      )
    ) {
      await queryRunner.createIndex(
        'empresa',
        new TableIndex({
          name: 'ux_empresa_system_key',
          columnNames: ['system_key'],
          isUnique: true,
        }),
      );
    }
    const freeCompany = (await queryRunner.query(
      "SELECT id FROM empresa WHERE system_key = 'free_trial' LIMIT 1",
    )) as unknown[];
    if (!freeCompany.length) {
      await queryRunner.query(
        'INSERT INTO empresa (nome, system_key, parametros_funcionalidades, created_at, updated_at) VALUES (\'SecurePlay Teste Gratuito\', \'free_trial\', \'{"rankingEnabled":false,"globalRankingEnabled":false,"achievementsEnabled":true,"enabledGames":["quiz-relampago","caca-phishing","classificacao-dados","termotech"]}\', NOW(6), NOW(6))',
      );
    }
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error(
        'Reversão automática desabilitada para preservar cadastros e histórico.',
      ),
    );
  }
}
