import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTextLessonsAndLearningPath1790726400000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('modulo', 'learning_path'))) {
      await queryRunner.addColumn('modulo', new TableColumn({
        name: 'learning_path',
        type: 'varchar',
        length: '64',
        default: "'principal'",
      }));
    }

    if (!(await this.hasEnumValue(queryRunner, 'modulo', 'texto'))) {
      await queryRunner.query(
        "ALTER TABLE `modulo` MODIFY COLUMN `type` ENUM('video','quadrinho','misto','texto') NOT NULL DEFAULT 'misto'",
      );
    }
    if (!(await this.hasEnumValue(queryRunner, 'aula', 'texto'))) {
      await queryRunner.query(
        "ALTER TABLE `aula` MODIFY COLUMN `type` ENUM('video','quadrinho','texto') NOT NULL DEFAULT 'video'",
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [textAulas] = await queryRunner.query(
      "SELECT COUNT(*) AS total FROM `aula` WHERE `type` = 'texto'",
    );
    const [textModulos] = await queryRunner.query(
      "SELECT COUNT(*) AS total FROM `modulo` WHERE `type` = 'texto' OR `learning_path` <> 'principal'",
    );
    if (Number(textAulas.total) || Number(textModulos.total)) {
      throw new Error('Desative ou migre as aulas e trilhas de texto antes de reverter o schema.');
    }

    await queryRunner.query(
      "ALTER TABLE `aula` MODIFY COLUMN `type` ENUM('video','quadrinho') NOT NULL DEFAULT 'video'",
    );
    await queryRunner.query(
      "ALTER TABLE `modulo` MODIFY COLUMN `type` ENUM('video','quadrinho','misto') NOT NULL DEFAULT 'misto'",
    );
    await queryRunner.dropColumn('modulo', 'learning_path');
  }

  private async hasEnumValue(
    queryRunner: QueryRunner,
    tableName: string,
    value: string,
  ): Promise<boolean> {
    const [column] = await queryRunner.query(
      'SELECT COLUMN_TYPE AS columnType FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [tableName, 'type'],
    );
    if (!column) throw new Error(`Coluna type ausente em ${tableName}`);
    return String(column.columnType).includes(`'${value}'`);
  }
}
