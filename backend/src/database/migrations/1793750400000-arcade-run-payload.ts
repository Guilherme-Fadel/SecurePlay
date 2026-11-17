import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Enunciado da partida do arcade (sem gabarito), para o start devolver a partida aberta em
 * vez de sortear outra. Coluna nula e aditiva: partidas antigas simplesmente não são
 * reaproveitadas.
 */
export class ArcadeRunPayload1793750400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('arcade_run', 'payload')) return;
    await queryRunner.addColumn(
      'arcade_run',
      new TableColumn({ name: 'payload', type: 'json', isNullable: true }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Perde só o enunciado de partidas abertas; resultados e gabaritos ficam.
    if (await queryRunner.hasColumn('arcade_run', 'payload'))
      await queryRunner.dropColumn('arcade_run', 'payload');
  }
}
