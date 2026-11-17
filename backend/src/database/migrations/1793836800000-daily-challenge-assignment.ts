import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Desafio do dia por aluno em SQL (M6). Tabela nova e aditiva: a versão publicada não a usa
 * e continua funcionando. Chave (usuario_id, day) resolve a corrida com INSERT IGNORE.
 */
export class DailyChallengeAssignment1793836800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('daily_challenge_assignment')) return;
    await queryRunner.createTable(
      new Table({
        name: 'daily_challenge_assignment',
        columns: [
          { name: 'usuario_id', type: 'int', isPrimary: true },
          { name: 'day', type: 'varchar', length: '10', isPrimary: true },
          { name: 'challenge_id', type: 'int' },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Perde só o histórico de atribuições; o desafio do dia volta a ser escolhido pelo Redis.
    if (await queryRunner.hasTable('daily_challenge_assignment'))
      await queryRunner.dropTable('daily_challenge_assignment');
  }
}
