import type { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import type { CharacterLook } from '../achievements/look';
import { calcLevel } from '../common/utils/xp.utils';
import { rankDisplayName, rankKey } from './rank-key';
import { loadRankingWeek, unavailableRankingWeek } from './ranking-weekly';
import {
  loadMetric,
  metricWindow,
  rankByValue,
  type MetricWindow,
  type RankedRow,
  type RankingCategory,
  type RankingStats,
} from './ranking-category';
import {
  CATEGORY_PAGE_SIZE,
  envelope,
  summarize,
  type CategoryRankingContext,
  type CategoryStudentEntry,
  type Ctx,
  type StudentBoard,
  type StudentRow,
} from './ranking-category-context';
import { turmasRanking } from './ranking-turmas-response';

export type {
  CategoryBoardCache,
  CategoryRankingContext,
  CategoryStudentEntry,
} from './ranking-category-context';

const byId = (a: StudentRow, b: StudentRow) => a.id - b.id;

/** Três métricas de poucos alunos: XP do conjunto e uma consulta agregada por métrica restante. */
async function statsFor(
  ctx: Ctx,
  ids: number[],
  window: MetricWindow | null,
  known?: { category: RankingCategory; values: Map<number, number> },
): Promise<Map<number, RankingStats>> {
  const metric = (m: 'streak' | 'challenges') =>
    known?.category === m
      ? Promise.resolve(known.values)
      : loadMetric(ctx.deps.dataSource, m, ids, window);
  const [streak, challenges] = await Promise.all([
    metric('streak'),
    metric('challenges'),
  ]);
  return new Map(
    ids.map((id) => [
      id,
      {
        xp: ctx.seasonPoints.get(id) ?? 0,
        streak: streak.get(id) ?? 0,
        challenges: challenges.get(id) ?? 0,
      },
    ]),
  );
}

async function loadStudentBoard(ctx: Ctx): Promise<StudentBoard> {
  const ids = ctx.allStats.map((entry) => entry.usuario_id);
  const window = metricWindow(ctx.mode, ctx.selectedSeason);
  const values =
    ctx.category === 'xp'
      ? ctx.seasonPoints
      : await loadMetric(ctx.deps.dataSource, ctx.category, ids, window);
  const rows = rankByValue(
    ids.map((id) => ({ id, value: values.get(id) ?? 0 })),
    byId,
  );
  const topIds = rows.slice(0, CATEGORY_PAGE_SIZE).map((row) => row.id);
  const topStats = await statsFor(ctx, topIds, window, {
    category: ctx.category,
    values,
  });
  return { rows, byId: new Map(rows.map((row) => [row.id, row])), topStats };
}

function entryName(ctx: Ctx, record: UsuarioStats | undefined, id: number) {
  const nick = record?.usuario?.nickname;
  if (ctx.mode !== 'season' && id === ctx.viewerId)
    return nick ?? record?.usuario?.name ?? 'Você';
  return rankDisplayName(nick, id);
}

async function studentsRanking(ctx: Ctx) {
  const { deps, viewerId, isManagementUser: management } = ctx;
  const board = (await deps.cache.get(
    `${ctx.datasetKey}|${ctx.category}|students`,
    () => loadStudentBoard(ctx),
  )) as StudentBoard;
  const window = metricWindow(ctx.mode, ctx.selectedSeason);
  const records = new Map(ctx.allStats.map((s) => [s.usuario_id, s]));
  const viewerRecord = management
    ? undefined
    : (records.get(viewerId) ??
      (ctx.mode === 'season' ? undefined : (ctx.viewerStats ?? undefined)));
  const top = board.rows.slice(0, CATEGORY_PAGE_SIZE);
  const looks = await deps
    .looks(
      top.map((row) => row.id),
      management ? null : viewerId,
    )
    .catch(() => new Map<number, CharacterLook>());
  let weekly = unavailableRankingWeek();
  if (ctx.category === 'xp' && ctx.mode === 'current' && ctx.includeWeekly) {
    try {
      weekly = await loadRankingWeek({
        redis: deps.redis,
        getScopedStats: () => Promise.resolve(ctx.allStats),
        seasonPoints: ctx.seasonPoints,
        currentUserId: management ? 0 : viewerId,
        looks: (ids) => deps.looks(ids, null),
      });
    } catch (error) {
      deps.warn(
        'Não foi possível calcular o histórico semanal do ranking',
        error,
      );
    }
  }
  const build = (
    id: number,
    row: RankedRow<StudentRow> | undefined,
    stats: RankingStats,
  ): CategoryStudentEntry => {
    const record =
      records.get(id) ?? (id === viewerId ? viewerRecord : undefined);
    return {
      rankKey: rankKey(id),
      position: row?.position ?? null,
      name: entryName(ctx, record, id),
      points: stats.xp,
      level: calcLevel(record?.total_points ?? 0),
      companyName:
        ctx.mode === 'season'
          ? (ctx.historicalCompanies.get(id) ?? null)
          : id === viewerId
            ? (ctx.company?.nome ?? null)
            : null,
      isCurrentUser: id === viewerId && !management,
      look: looks.get(id) ?? {},
      // Sem posição (valor 0) não há movimento a mostrar.
      weeklyChange: row ? (weekly.changes?.get(id) ?? null) : null,
      value: stats[ctx.category],
      stats,
    };
  };
  const leaderboard = top.map((row) =>
    build(row.id, row, board.topStats.get(row.id)!),
  );
  let currentUser: CategoryStudentEntry | null = null;
  if (!management && viewerRecord) {
    const row = board.byId.get(viewerId);
    const stats =
      board.topStats.get(viewerId) ??
      (await statsFor(ctx, [viewerId], window)).get(viewerId)!;
    currentUser = build(viewerId, row, stats);
  }
  const summary = summarize(
    board.rows.map((row) => row.value),
    currentUser?.value ?? 0,
    currentUser?.position ?? null,
    management,
  );
  return {
    ...envelope(ctx, board.rows.length),
    top: leaderboard.slice(0, 3),
    leaderboard,
    currentUser,
    viewerParticipates:
      !management && (ctx.mode !== 'season' || !!viewerRecord),
    weeklyPositionChange:
      management || ctx.mode !== 'current' || !currentUser?.position
        ? null
        : (weekly.changes?.get(viewerId) ?? null),
    weeklyDataAvailable: weekly.available,
    weeklyHighlights: weekly.highlights,
    summary,
  };
}

/** Ranking por categoria (XP, sequência, desafios) de alunos ou turmas, sobre o conjunto já filtrado por escopo. */
export function buildCategoryRanking(ctx: CategoryRankingContext) {
  return ctx.unit === 'turmas' ? turmasRanking(ctx) : studentsRanking(ctx);
}
