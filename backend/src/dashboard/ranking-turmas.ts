import type { DataSource } from 'typeorm';
import { turmaKey } from './rank-key';
import {
  chunkIds,
  globalEligibleCompanySql,
  loadMetric,
  rankByValue,
  type MetricWindow,
  type RankedRow,
  type RankingCategory,
  type RankingStats,
} from './ranking-category';

export interface TurmaRow {
  id: number;
  name: string;
  companyName: string | null;
  studentCount: number;
  /** Soma da métrica da categoria sobre os alunos participantes da turma. */
  value: number;
  /** Somas das três métricas no mesmo período. */
  stats: RankingStats;
}

export type TurmaPositioned = TurmaRow & { position: number | null };

export interface TurmaBoard {
  /** Turmas com soma > 0, ordenadas, com posição. */
  ranked: Array<RankedRow<TurmaRow>>;
  /** Todas as turmas com participante (inclui soma 0, sem posição). */
  byId: Map<number, TurmaPositioned>;
  /** Turmas de cada aluno participante. */
  turmasOfUser: Map<number, number[]>;
}

/** Entrada pública de turma: nenhum dado de aluno, só agregados. */
export interface TurmaEntry {
  rankKey: string;
  position: number | null;
  name: string;
  companyName: string | null;
  studentCount: number;
  value: number;
  stats: RankingStats;
  mine: boolean;
}

interface MemberRow {
  usuario_id: number;
  turma_id: number;
  nome: string;
  empresa_nome: string | null;
}

const sum = (map: Map<number, number>, ids: number[]) =>
  ids.reduce((total, id) => total + (map.get(id) ?? 0), 0);

/**
 * Placar de turmas: soma da métrica sobre os alunos participantes de cada turma.
 * Consultas agregadas: vínculos (turma_aluno ⨝ turma ⨝ empresa) e uma por métrica.
 */
export async function loadTurmaBoard(options: {
  dataSource: Pick<DataSource, 'query'>;
  category: RankingCategory;
  window: MetricWindow | null;
  participantIds: number[];
  seasonPoints: Map<number, number>;
  /** Escopo pedido: a turma tem de ser da escola (company) ou de escola elegível ao global. */
  scope: 'global' | 'company';
  companyId: number | null;
}): Promise<TurmaBoard> {
  const { dataSource, participantIds } = options;
  const scopeSql =
    options.scope === 'company'
      ? 'AND t.empresa_id = ?'
      : `AND ${globalEligibleCompanySql('e')}`;
  const scopeParams =
    options.scope === 'company' ? [options.companyId ?? -1] : [];
  const members = (
    await Promise.all(
      chunkIds(participantIds).map((chunk) =>
        dataSource.query<MemberRow[]>(
          `SELECT ta.usuario_id, t.id AS turma_id, t.nome, e.nome AS empresa_nome
           FROM turma_aluno ta
           INNER JOIN turma t ON t.id = ta.turma_id AND t.ativa = 1
           INNER JOIN empresa e ON e.id = t.empresa_id
           WHERE ta.usuario_id IN (${chunk.map(() => '?').join(',')}) ${scopeSql}`,
          [...chunk, ...scopeParams],
        ),
      ),
    )
  ).flat();
  const memberIds = [...new Set(members.map((m) => Number(m.usuario_id)))];
  const [streak, challenges] = await Promise.all([
    loadMetric(dataSource, 'streak', memberIds, options.window),
    loadMetric(dataSource, 'challenges', memberIds, options.window),
  ]);
  const grouped = new Map<number, { row: MemberRow; ids: number[] }>();
  const turmasOfUser = new Map<number, number[]>();
  for (const member of members) {
    const userId = Number(member.usuario_id);
    const turmaId = Number(member.turma_id);
    const group = grouped.get(turmaId) ?? { row: member, ids: [] };
    group.ids.push(userId);
    grouped.set(turmaId, group);
    turmasOfUser.set(userId, [...(turmasOfUser.get(userId) ?? []), turmaId]);
  }
  const rows: TurmaRow[] = [...grouped.entries()].map(([id, group]) => {
    const stats = {
      xp: sum(options.seasonPoints, group.ids),
      streak: sum(streak, group.ids),
      challenges: sum(challenges, group.ids),
    };
    return {
      id,
      name: group.row.nome,
      companyName: group.row.empresa_nome,
      studentCount: group.ids.length,
      value: stats[options.category],
      stats,
    };
  });
  const ranked = rankByValue(
    rows,
    (a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id - b.id,
  );
  const byId = new Map<number, TurmaPositioned>(
    rows.map((row) => [row.id, { ...row, position: null }]),
  );
  for (const row of ranked) byId.set(row.id, row);
  return { ranked, byId, turmasOfUser };
}

/** Turma do aluno com melhor posição (turma sem posição fica por último); `null` fora de turma. */
export function viewerTurmaRow(
  board: TurmaBoard,
  viewerId: number,
): TurmaPositioned | null {
  const rows = (board.turmasOfUser.get(viewerId) ?? [])
    .map((id) => board.byId.get(id))
    .filter((row): row is TurmaPositioned => !!row);
  rows.sort(
    (a, b) =>
      (a.position ?? Number.MAX_SAFE_INTEGER) -
        (b.position ?? Number.MAX_SAFE_INTEGER) || a.id - b.id,
  );
  return rows[0] ?? null;
}

export function toTurmaEntry(
  row: TurmaPositioned,
  mine: boolean,
  scope: 'global' | 'company',
): TurmaEntry {
  return {
    rankKey: turmaKey(row.id),
    position: row.position,
    name: row.name,
    companyName: scope === 'global' ? row.companyName : null,
    studentCount: row.studentCount,
    value: row.value,
    stats: row.stats,
    mine,
  };
}
