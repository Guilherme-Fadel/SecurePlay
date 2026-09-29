import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableFreeTrialCompanyRanking1790640000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      "SELECT id, parametros_funcionalidades FROM empresa WHERE system_key = 'free_trial' LIMIT 1 FOR UPDATE",
    ) as Array<{ id: number; parametros_funcionalidades: string | Record<string, unknown> | null }>;
    const company = rows[0];
    if (!company) return;

    const raw = company.parametros_funcionalidades;
    const parameters = (typeof raw === 'string' ? JSON.parse(raw) : raw) ?? {};
    if (parameters.rankingEnabled === true) return;

    await queryRunner.query(
      'UPDATE empresa SET parametros_funcionalidades = ?, updated_at = NOW(6) WHERE id = ?',
      [JSON.stringify({ ...parameters, rankingEnabled: true }), company.id],
    );
  }

  async down(): Promise<void> {
    throw new Error(
      'Reversão automática desabilitada: o valor anterior da configuração deve ser restaurado a partir do backup da empresa free_trial.',
    );
  }
}
