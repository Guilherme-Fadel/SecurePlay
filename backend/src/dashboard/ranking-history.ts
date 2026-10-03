import { DataSource } from 'typeorm';
import { getLocalDateKey } from '../common/utils/date.utils';

export type RankingMode = 'current' | 'season' | 'total';
export type RankingCompleteness = 'complete' | 'partial' | 'unavailable';

const FIRST_SEASON = '2026-09';

export function seasonBounds(id: string) {
  const [year, month] = id.split('-').map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return {
    startsAt: `${id}-01T00:00:00-03:00`,
    endsAt: `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00-03:00`,
  };
}

export function seasonName(id: string) {
  const [year, month] = id.split('-').map(Number);
  const index = (year - 2026) * 12 + month - 9;
  return `Temporada ${index + 1}`;
}

export function validateRankingSelection(
  mode?: unknown,
  season?: unknown,
): { mode: RankingMode; selectedSeason: string | null } {
  if (mode !== undefined && typeof mode !== 'string')
    throw new Error('Modo de ranking inválido');
  if (season !== undefined && typeof season !== 'string')
    throw new Error('Temporada inválida');
  const selectedMode = mode ?? 'current';
  if (!['current', 'season', 'total'].includes(selectedMode))
    throw new Error('Modo de ranking inválido');
  if (selectedMode !== 'season' && season !== undefined)
    throw new Error('Temporada somente é aceita no modo season');
  const todaySeason = getLocalDateKey().slice(0, 7);
  if (selectedMode === 'season') {
    if (
      !season ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(season) ||
      season < FIRST_SEASON ||
      season >= todaySeason
    ) {
      throw new Error('Temporada encerrada inválida');
    }
  }
  return {
    mode: selectedMode as RankingMode,
    selectedSeason:
      selectedMode === 'season'
        ? season!
        : selectedMode === 'current'
          ? todaySeason
          : null,
  };
}

function seasonIds(current: string): string[] {
  const ids: string[] = [];
  let [year, month] = FIRST_SEASON.split('-').map(Number);
  while (`${year}-${String(month).padStart(2, '0')}` <= current) {
    ids.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month === 13) {
      year += 1;
      month = 1;
    }
  }
  return ids.reverse();
}

export function hasFullSeasonCoverage(
  startLocalAt: string | null | undefined,
  seasonId: string,
): boolean {
  return !!startLocalAt && startLocalAt <= `${seasonId}-01 00:00:00.000000`;
}

export async function ensureRankingTracking(
  dataSource: DataSource,
): Promise<void> {
  const existing = await dataSource.query<Array<{ id: number }>>(
    'SELECT id FROM ranking_tracking WHERE id = 1',
  );
  if (!existing.length) {
    await dataSource.query(
      'INSERT INTO ranking_tracking (id, start_local_at) VALUES (1, NULL) ON DUPLICATE KEY UPDATE id = id',
    );
  }
  await dataSource.query(
    `UPDATE ranking_tracking SET start_local_at = UTC_TIMESTAMP(6) - INTERVAL 3 HOUR WHERE id = 1 AND start_local_at IS NULL`,
  );
}

export async function rankingHistoryContext(
  dataSource: DataSource,
  mode: RankingMode,
  selectedSeason: string | null,
) {
  const now = getLocalDateKey().slice(0, 7);
  await ensureRankingTracking(dataSource);
  const tracking = await dataSource.query<
    Array<{ start_local_at: string | null }>
  >(
    "SELECT DATE_FORMAT(start_local_at, '%Y-%m-%d %H:%i:%s.%f') AS start_local_at FROM ranking_tracking WHERE id = 1",
  );
  const startedAt = tracking[0]?.start_local_at;
  const availableSeasons = seasonIds(now).map((id) => {
    const status = id === now ? ('active' as const) : ('closed' as const);
    const startedBefore = hasFullSeasonCoverage(startedAt, id);
    const completeness: RankingCompleteness =
      status === 'active'
        ? startedBefore
          ? 'complete'
          : 'partial'
        : startedBefore
          ? 'complete'
          : 'unavailable';
    return {
      id,
      name: seasonName(id),
      ...seasonBounds(id),
      status,
      completeness,
    };
  });
  const selected = availableSeasons.find((item) => item.id === selectedSeason);
  return {
    availableSeasons,
    dataCompleteness:
      mode === 'total'
        ? ('complete' as const)
        : (selected?.completeness ?? ('unavailable' as const)),
    trackingStartedAt: startedAt ?? null,
  };
}

/** Fecha uma temporada somente com cobertura integral; o lock serializa leitores concorrentes. */
export async function closeRankingSeason(
  dataSource: DataSource,
  seasonId: string,
): Promise<boolean> {
  const now = getLocalDateKey().slice(0, 7);
  if (seasonId >= now) return false;
  await ensureRankingTracking(dataSource);
  const started = await dataSource.query<
    Array<{ start_local_at: string | null }>
  >(
    "SELECT DATE_FORMAT(start_local_at, '%Y-%m-%d %H:%i:%s.%f') AS start_local_at FROM ranking_tracking WHERE id = 1",
  );
  if (!hasFullSeasonCoverage(started[0]?.start_local_at, seasonId))
    return false;
  return dataSource.transaction(async (manager) => {
    await manager.query(
      'SELECT id FROM ranking_tracking WHERE id = 1 FOR UPDATE',
    );
    const closed = await manager.query<Array<{ season_id: string }>>(
      'SELECT season_id FROM ranking_season_close WHERE season_id = ?',
      [seasonId],
    );
    if (closed.length) return true;
    await manager.query(
      `INSERT INTO ranking_season_snapshot
      (season_id, usuario_id, points, total_points, display_name, profile_image_key, empresa_id, empresa_nome, global_eligible)
      SELECT ?, s.usuario_id, COALESCE(p.points, 0),
        s.total_points - COALESCE((SELECT SUM(future.points) FROM ranking_season_points future
          WHERE future.usuario_id = s.usuario_id AND future.season_id > ?), 0),
        COALESCE(u.nickname, CONCAT('Aventureiro ', u.id)), u.profile_image_key,
        u.empresa_id, e.nome,
        CASE WHEN u.trial_started_at IS NULL
          AND JSON_UNQUOTE(JSON_EXTRACT(e.parametros_funcionalidades, '$.globalRankingEnabled')) = 'true'
          AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(e.parametros_funcionalidades, '$.rankingEnabled')), 'true') = 'true'
          THEN 1 ELSE 0 END
      FROM usuario_stats s INNER JOIN usuario u ON u.id = s.usuario_id
      LEFT JOIN empresa e ON e.id = u.empresa_id
      LEFT JOIN ranking_season_points p ON p.season_id = ? AND p.usuario_id = s.usuario_id
      WHERE u.role = 'user'`,
      [seasonId, seasonId, seasonId],
    );
    await manager.query(
      'INSERT INTO ranking_season_close (season_id, closed_at) VALUES (?, NOW(6))',
      [seasonId],
    );
    return true;
  });
}

const completedMonthByDataSource = new WeakMap<DataSource, string>();
const closureInFlightByDataSource = new WeakMap<DataSource, Promise<void>>();

/** Barreira idempotente para startup, virada, requests e créditos em background. */
export async function ensurePendingRankingSeasonsClosed(
  dataSource: DataSource,
): Promise<void> {
  const month = getLocalDateKey().slice(0, 7);
  if (completedMonthByDataSource.get(dataSource) === month) return;
  const running = closureInFlightByDataSource.get(dataSource);
  if (running) return running;
  const closure = (async () => {
    const { availableSeasons } = await rankingHistoryContext(
      dataSource,
      'total',
      null,
    );
    for (const season of [...availableSeasons].reverse()) {
      if (season.status === 'closed' && season.completeness === 'complete') {
        await closeRankingSeason(dataSource, season.id);
      }
    }
    completedMonthByDataSource.set(dataSource, month);
  })();
  closureInFlightByDataSource.set(dataSource, closure);
  try {
    await closure;
  } finally {
    if (closureInFlightByDataSource.get(dataSource) === closure)
      closureInFlightByDataSource.delete(dataSource);
  }
}

export async function loadSeasonPoints(
  dataSource: DataSource,
  seasonId: string,
  userIds: number[],
) {
  if (userIds.length === 0) return new Map<number, number>();
  const rows = await dataSource.query<
    Array<{ usuario_id: number; points: number }>
  >(
    `SELECT usuario_id, points FROM ranking_season_points WHERE season_id = ? AND usuario_id IN (${userIds.map(() => '?').join(',')})`,
    [seasonId, ...userIds],
  );
  return new Map<number, number>(
    rows.map((row: { usuario_id: number; points: number }) => [
      Number(row.usuario_id),
      Number(row.points),
    ]),
  );
}

export function historicalSeason(id: string) {
  return {
    name: seasonName(id),
    ...seasonBounds(id),
    status: 'closed' as const,
  };
}
