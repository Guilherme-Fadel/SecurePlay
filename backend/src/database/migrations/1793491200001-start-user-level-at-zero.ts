import { MigrationInterface, QueryRunner } from 'typeorm';

/** Altera somente o default de cadastros novos; preserva XP e registros existentes. */
export class StartUserLevelAtZero1793491200001 implements MigrationInterface {
  name = 'StartUserLevelAtZero1793491200001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `usuario` ALTER COLUMN `level` SET DEFAULT 0',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `usuario` ALTER COLUMN `level` SET DEFAULT 1',
    );
  }
}
