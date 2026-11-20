import type { DataSource } from 'typeorm';
import type { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import type { RedisService } from '../redis/redis.service';
import type { CharacterLook } from '../achievements/look';
import { historicalSeason, type RankingMode } from './ranking-history';
import { getRankingSeason } from './ranking-season';
import type {
  RankedRow,
  RankingCategory,
  RankingStats,
  RankingUnit,
  TtlCache,
} from './ranking-category';
import type { TurmaBoard } from './ranking-turmas';

export const CATEGORY_PAGE_SIZE = 50;

export interface StudentRow {
  id: number;
  value: number;
}

/** Placar de alunos de uma categoria (cacheado): todas as posições e as três métricas do topo. */
export interface StudentBoard {
  rows: Array<RankedRow<StudentRow>>;
  byId: Map<number, RankedRow<StudentRow>>;
  topStats: Map<number, RankingStats>;
}

export type CategoryBoardCache = TtlCache<StudentBoard | TurmaBoard>;

export interface CategoryStudentEntry {
  rankKey: string;
  position: number | null;
  name: string;
  /** XP do período (igual a `stats.xp`); mantido pela compatibilidade com o ranking de XP. */
  points: number;
  level: number;
  companyName: string | null;
  isCurrentUser: boolean;
  look: CharacterLook;
  profileImageUrl: string | null;
  /** Mudança de posição na semana; só em category=xp, período atual e alunos. */
  weeklyChange: number | null;
  /** Métrica da categoria pedida, no período. */
  value: number;
  stats: RankingStats;
}

export interface CategoryRankingContext {
  viewerId: number;
  isManagementUser: boolean;
  scope: 'global' | 'company';
  companyAvailable: boolean;
  company: { id: number; nome: string } | null;
  mode: RankingMode;
  selectedSeason: string | null;
  history: { availableSeasons: unknown[]; dataCompleteness: string };
  category: RankingCategory;
  unit: RankingUnit;
  datasetKey: string;
  allStats: UsuarioStats[];
  seasonPoints: Map<number, number>;
  historicalCompanies: Map<number, string | null>;
  /** Estatísticas do próprio usuário (com `usuario`), para quem não está no conjunto. */
  viewerStats: UsuarioStats | null;
  includeImages: boolean;
  includeWeekly: boolean;
  deps: {
    dataSource: DataSource;
    redis: RedisService;
    cache: CategoryBoardCache;
    looks: (
      ids: number[],
      viewerId: number | null,
    ) => Promise<Map<number, CharacterLook>>;
    photo: (key: string | null | undefined) => Promise<string | null>;
    warn: (message: string, error: unknown) => void;
  };
}

export type Ctx = CategoryRankingContext;

/** Mesmo cálculo do ranking de XP, agora sobre o valor da categoria. */
export function summarize(
  values: number[],
  mine: number,
  position: number | null,
  management: boolean,
) {
  const leader = values[0] ?? mine;
  const next = values.filter((v) => v > mine).pop();
  const total = values.length;
  return {
    leaderPoints: leader,
    pointsBehindLeader: management ? null : Math.max(0, leader - mine),
    pointsToNextPosition: management
      ? null
      : next === undefined
        ? 0
        : Math.max(1, next - mine + 1),
    percentile:
      management || position === null
        ? null
        : total <= 1
          ? 100
          : Math.max(0, Math.round(((total - position) / (total - 1)) * 100)),
  };
}

export function envelope(ctx: Ctx, totalParticipants: number) {
  const season =
    ctx.mode === 'season' && ctx.selectedSeason
      ? historicalSeason(ctx.selectedSeason)
      : getRankingSeason();
  return {
    category: ctx.category,
    unit: ctx.unit,
    scope: ctx.scope,
    companyAvailable: ctx.companyAvailable,
    company: ctx.company
      ? { id: ctx.company.id, name: ctx.company.nome }
      : null,
    totalParticipants,
    season,
    mode: ctx.mode,
    metric: ctx.mode === 'total' ? ('totalXp' as const) : ('seasonXp' as const),
    selectedSeason: ctx.selectedSeason,
    availableSeasons: ctx.history.availableSeasons,
    dataCompleteness: ctx.history.dataCompleteness,
  };
}
