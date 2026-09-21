import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Apelidos são uma identidade exclusiva dos participantes. A limpeza é
 * intencional e permanente: administradores não podem reaparecer no ranking.
 */
export class ManagementUsersRankingAndNicknames1790121600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE usuario
      SET nickname = NULL,
          nickname_pending = NULL,
          nickname_request_status = 'none'
      WHERE role IN ('admin', 'platform_admin')
    `);
  }

  async down(): Promise<void> {
    // Os apelidos removidos não podem ser reconstruídos com segurança.
  }
}
