import { Repository } from 'typeorm';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';
import { Usuario } from '../../usuario/usuario.entity';
import { getLocalDateKey } from '../utils/date.utils';
import { ensurePendingRankingSeasonsClosed } from '../../dashboard/ranking-history';

/** O total e o acumulado mensal fazem parte da mesma transação MySQL. */
export async function creditSeasonXp(
  repository: Repository<UsuarioStats>,
  usuarioId: number,
  amount: number,
): Promise<number> {
  await ensurePendingRankingSeasonsClosed(repository.manager.connection);
  // Fallback para inicialização antes do primeiro módulo de dashboard subir.
  const tracking = await repository.manager.query<
    Array<{ start_local_at: Date | null }>
  >('SELECT start_local_at FROM ranking_tracking WHERE id = 1');
  if (!tracking[0]?.start_local_at) {
    if (!tracking.length) {
      await repository.manager.query(
        'INSERT INTO ranking_tracking (id, start_local_at) VALUES (1, NULL) ON DUPLICATE KEY UPDATE id = id',
      );
    }
    await repository.manager.query(
      `UPDATE ranking_tracking SET start_local_at = UTC_TIMESTAMP(6) - INTERVAL 3 HOUR WHERE id = 1 AND start_local_at IS NULL`,
    );
  }
  return repository.manager.transaction(async (manager) => {
    // Créditos compartilham o lock; o fechamento usa FOR UPDATE e espera todos.
    // O mês é definido somente após adquirir o lock compartilhado.
    await manager.query(
      'SELECT id FROM ranking_tracking WHERE id = 1 LOCK IN SHARE MODE',
    );
    const seasonId = getLocalDateKey().slice(0, 7);
    // A linha do usuário existe antes de stats e serializa a criação concorrente.
    await manager
      .getRepository(Usuario)
      .createQueryBuilder('u')
      .setLock('pessimistic_write')
      .where('u.id = :id', { id: usuarioId })
      .getOneOrFail();
    const statsRepo = manager.getRepository(UsuarioStats);
    let stats = await statsRepo.findOne({ where: { usuario_id: usuarioId } });
    if (!stats)
      stats = statsRepo.create({ usuario_id: usuarioId, total_points: 0 });
    const previousPoints = stats.total_points;
    stats.total_points += amount;
    await statsRepo.save(stats);
    await manager.query(
      'INSERT INTO ranking_season_points (season_id, usuario_id, points) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE points = points + VALUES(points)',
      [seasonId, usuarioId, amount],
    );
    return previousPoints;
  });
}
