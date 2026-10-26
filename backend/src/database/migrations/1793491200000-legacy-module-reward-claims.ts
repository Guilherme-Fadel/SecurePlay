import { MigrationInterface, QueryRunner } from 'typeorm';

/** Baseline conservador: não inventa XP nem reabre direito legado ao editar catálogo. */
export class LegacyModuleRewardClaims1793491200000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasTable('activity_completion')))
      throw new Error(
        'Aplique a migração de conclusão antes do baseline de módulo',
      );
    await runner.query(`
      INSERT INTO activity_completion
        (id, usuario_id, activity_type, activity_id, result, xp, previous_points, effects_processed, created_at)
      SELECT UUID(), completed.usuario_id, 'module', completed.modulo_id,
             JSON_OBJECT('xp', 0, 'legacy', true, 'policy', 'legacy-complete-at-cutover'), 0, 0, 1, CURRENT_TIMESTAMP(6)
      FROM (
        SELECT ua.usuario_id, a.modulo_id
        FROM usuario_aula ua
        INNER JOIN aula a ON a.id = ua.aula_id AND a.active = 1
        INNER JOIN modulo m ON m.id = a.modulo_id
        WHERE ua.completed = 1
        GROUP BY ua.usuario_id, a.modulo_id
        HAVING COUNT(DISTINCT a.id) = (SELECT COUNT(*) FROM aula catalog WHERE catalog.modulo_id = a.modulo_id AND catalog.active = 1)
      ) completed
      ON DUPLICATE KEY UPDATE id = activity_completion.id
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    const claims: unknown = await runner.query(`
      SELECT 1 FROM activity_completion
      WHERE activity_type = 'module' AND JSON_UNQUOTE(JSON_EXTRACT(result, '$.policy')) = 'legacy-complete-at-cutover'
      LIMIT 1
    `);
    if (!Array.isArray(claims) || claims.length)
      throw new Error(
        'Rollback bloqueado: remover claims legados reabriria concessão de bônus',
      );
  }
}
