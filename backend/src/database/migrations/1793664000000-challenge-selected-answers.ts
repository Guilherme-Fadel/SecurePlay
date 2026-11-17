import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Respostas escolhidas no desafio diário, gravadas no primeiro PATCH de cada questão
 * (`{ [questionId]: selectedIndex }`). Coluna nula e aditiva: tentativas abertas antes do
 * deploy continuam válidas e seguem a regra antiga no envio.
 */
export class ChallengeSelectedAnswers1793664000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('usuario_challenge', 'selected_answers'))
      return;
    await queryRunner.addColumn(
      'usuario_challenge',
      new TableColumn({
        name: 'selected_answers',
        type: 'json',
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Perde só as respostas parciais de tentativas abertas; resultados concluídos ficam.
    if (await queryRunner.hasColumn('usuario_challenge', 'selected_answers'))
      await queryRunner.dropColumn('usuario_challenge', 'selected_answers');
  }
}
