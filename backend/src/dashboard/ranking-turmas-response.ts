import { metricWindow } from './ranking-category';
import {
  CATEGORY_PAGE_SIZE,
  envelope,
  summarize,
  type Ctx,
} from './ranking-category-context';
import {
  loadTurmaBoard,
  toTurmaEntry,
  viewerTurmaRow,
  type TurmaBoard,
  type TurmaEntry,
} from './ranking-turmas';

/** Ranking de turmas: soma da categoria sobre os alunos participantes; só agregados na resposta. */
export async function turmasRanking(ctx: Ctx) {
  const { viewerId, isManagementUser: management } = ctx;
  const board = (await ctx.deps.cache.get(
    `${ctx.datasetKey}|${ctx.category}|turmas`,
    () =>
      loadTurmaBoard({
        dataSource: ctx.deps.dataSource,
        category: ctx.category,
        window: metricWindow(ctx.mode, ctx.selectedSeason),
        participantIds: ctx.allStats.map((s) => s.usuario_id),
        seasonPoints: ctx.seasonPoints,
        scope: ctx.scope,
        companyId: ctx.company?.id ?? null,
      }),
  )) as TurmaBoard;
  const mineIds = new Set(
    management ? [] : (board.turmasOfUser.get(viewerId) ?? []),
  );
  const leaderboard: TurmaEntry[] = board.ranked
    .slice(0, CATEGORY_PAGE_SIZE)
    .map((row) => toTurmaEntry(row, mineIds.has(row.id), ctx.scope));
  const mine = management ? null : viewerTurmaRow(board, viewerId);
  const viewerInSet =
    !management && ctx.allStats.some((s) => s.usuario_id === viewerId);
  return {
    ...envelope(ctx, board.ranked.length),
    top: leaderboard.slice(0, 3),
    leaderboard,
    currentUser: mine ? toTurmaEntry(mine, true, ctx.scope) : null,
    viewerParticipates: !management && (ctx.mode !== 'season' || viewerInSet),
    weeklyPositionChange: null,
    weeklyDataAvailable: false,
    weeklyHighlights: [] as never[],
    summary: summarize(
      board.ranked.map((row) => row.value),
      mine?.value ?? 0,
      mine?.position ?? null,
      management,
    ),
  };
}
