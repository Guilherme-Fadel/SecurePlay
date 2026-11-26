import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Cor base escolhida pelo aluno para o personagem; nula = cor padrão pela rankKey. */
export class CharacterColor1794268800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('usuario', 'character_color')) return;

    await queryRunner.addColumn(
      'usuario',
      new TableColumn({
        name: 'character_color',
        type: 'varchar',
        length: '16',
        isNullable: true,
        default: null,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('usuario', 'character_color'))) return;
    await queryRunner.dropColumn('usuario', 'character_color');
  }
}
