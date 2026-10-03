import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRankingSeasonHistory1791072000000 implements MigrationInterface {
  name = 'AddRankingSeasonHistory1791072000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS ranking_tracking (id tinyint NOT NULL PRIMARY KEY, start_local_at datetime(6) NULL) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `INSERT INTO ranking_tracking (id, start_local_at) VALUES (1, NULL) ON DUPLICATE KEY UPDATE id = id`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS ranking_season_points (season_id varchar(7) NOT NULL, usuario_id int NOT NULL, points int NOT NULL DEFAULT 0, PRIMARY KEY (season_id, usuario_id), CONSTRAINT fk_ranking_season_points_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE RESTRICT) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS ranking_season_close (season_id varchar(7) NOT NULL PRIMARY KEY, closed_at datetime(6) NOT NULL) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS ranking_season_snapshot (season_id varchar(7) NOT NULL, usuario_id int NOT NULL, points int NOT NULL, total_points int NOT NULL, display_name varchar(100) NOT NULL, profile_image_key varchar(255) NULL, empresa_id int NULL, empresa_nome varchar(100) NULL, global_eligible tinyint(1) NOT NULL, PRIMARY KEY (season_id, usuario_id), INDEX idx_ranking_snapshot_company (season_id, empresa_id, points), INDEX idx_ranking_snapshot_global (season_id, global_eligible, points)) ENGINE=InnoDB`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE ranking_season_snapshot');
    await queryRunner.query('DROP TABLE ranking_season_close');
    await queryRunner.query('DROP TABLE ranking_season_points');
    await queryRunner.query('DROP TABLE ranking_tracking');
  }
}
