import type { DataSource } from 'typeorm';
import { seasonBounds, type RankingMode } from './ranking-history';

export type RankingCategory = 'xp' | 'streak' | 'challenges';
export type RankingUnit = 'students' | 'turmas';

/** As três métricas do mesmo período (em turmas: somas dos alunos participantes). */
export interface RankingStats {
  xp: number;
  streak: number;
  challenges: number;
}

const CATEGORIES: unknown[] = ['xp', 'streak', 'challenges'];
const UNITS: unknown[] = ['students', 'turmas'];

/** Valida `category` e `unit` da query. Ausente = indefinido (resposta legada). */
export function parseRankingView(
  category?: unknown,
  unit?: unknown,
): { category?: RankingCategory; unit?: RankingUnit } {
  if (category !== undefined && !CATEGORIES.includes(category))
    throw new Error('Categoria de ranking inválida');
  if (unit !== undefined && !UNITS.includes(unit))
    throw new Error('Unidade de ranking inválida');
  return {
    category: category as RankingCategory | undefined,
    unit: unit as RankingUnit | undefined,
  };
}

/**
 * Escola que participa do ranking global: ranking e ranking global ligados nos parâmetros.
 * Única definição, usada pelo filtro de alunos do `getRanking` e pelo de turmas.
 */
export const globalEligibleCompanySql = (alias: string) =>
  `JSON_UNQUOTE(JSON_EXTRACT(${alias}.parametros_funcionalidades, '$.globalRankingEnabled')) = 'true'
          AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${alias}.parametros_funcionalidades, '$.rankingEnabled')), 'true') = 'true'`;

/** Janela [from, to) em datas de Brasília; `null` = todos os tempos. */
export interface MetricWindow {
  from: string;
  to: string;
}

export function metricWindow(
  mode: RankingMode,
  selectedSeason: string | null,
): MetricWindow | null {
  if (mode === 'total' || !selectedSeason) return null;
  const bounds = seasonBounds(selectedSeason);
  return { from: bounds.startsAt.slice(0, 10), to: bounds.endsAt.slice(0, 10) };
}

export type RankedRow<T> = T & { position: number };

/** Ordena por valor decrescente (empate pelo critério dado), tira o 0 e divide a posição no empate. */
export function rankByValue<T extends { value: number }>(
  items: T[],
  tieBreak: (a: T, b: T) => number,
): Array<RankedRow<T>> {
  const sorted = items
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value || tieBreak(a, b));
  let position = 0;
  let previous: number | null = null;
  return sorted.map((item, index) => {
    if (previous === null || item.value < previous) {
      position = index + 1;
      previous = item.value;
    }
    return { ...item, position };
  });
}

const ID_CHUNK = 2000;

export function chunkIds(ids: number[], size = ID_CHUNK): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += size)
    chunks.push(ids.slice(i, i + size));
  return chunks;
}

type MetricRow = { usuario_id: number; value: string | number };

/**
 * Sequência por aluno: o maior entre `MAX(daily_checkin.streak)` e `usuario_stats.current_streak`
 * (a tabela de check-ins só existe desde a migração do check-in diário; sequências anteriores ficam só
 * em `usuario_stats`). Com janela, o check-in conta pelo `day` e o `current_streak` só quando
 * `last_checkin_date` cai na mesma janela. Uma consulta agregada por bloco de ids.
 */
function streakSql(marks: string, window: MetricWindow | null): string {
  return `SELECT usuario_id, MAX(value) AS value FROM (
            SELECT usuario_id, MAX(streak) AS value FROM daily_checkin
            WHERE usuario_id IN (${marks})${window ? ' AND day >= ? AND day < ?' : ''}
            GROUP BY usuario_id
            UNION ALL
            SELECT usuario_id, current_streak AS value FROM usuario_stats
            WHERE usuario_id IN (${marks}) AND current_streak > 0${window ? ' AND last_checkin_date >= ? AND last_checkin_date < ?' : ''}
          ) AS streaks
          GROUP BY usuario_id`;
}

/**
 * Sequência ou desafios concluídos por aluno: um GROUP BY por bloco de ids.
 * O banco guarda datetime em horário de Brasília (timezone -03:00), igual à janela.
 */
export async function loadMetric(
  dataSource: Pick<DataSource, 'query'>,
  metric: 'streak' | 'challenges',
  ids: number[],
  window: MetricWindow | null,
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  const rowsPerChunk = await Promise.all(
    chunkIds(ids).map((chunk) => {
      const marks = chunk.map(() => '?').join(',');
      if (metric === 'streak') {
        const range = window ? [window.from, window.to] : [];
        return dataSource.query<MetricRow[]>(streakSql(marks, window), [
          ...chunk,
          ...range,
          ...chunk,
          ...range,
        ]);
      }
      return dataSource.query<MetricRow[]>(
        `SELECT usuario_id, COUNT(*) AS value FROM usuario_challenge
         WHERE usuario_id IN (${marks}) AND completed = 1${window ? ' AND completed_at >= ? AND completed_at < ?' : ''}
         GROUP BY usuario_id`,
        window
          ? [...chunk, `${window.from} 00:00:00`, `${window.to} 00:00:00`]
          : chunk,
      );
    }),
  );
  for (const rows of rowsPerChunk)
    for (const row of rows)
      result.set(Number(row.usuario_id), Number(row.value));
  return result;
}

/** Cache curto de promessas (requisições simultâneas somam), descartado quando o progresso muda. */
export class TtlCache<T> {
  private readonly entries = new Map<
    string,
    { expiresAt: number; data: Promise<T> }
  >();

  constructor(
    private readonly ttlMs = 30_000,
    private readonly maxKeys = 500,
  ) {}

  get(key: string, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > now) return hit.data;
    if (this.entries.size >= this.maxKeys) this.entries.clear();
    const data = load();
    this.entries.set(key, { expiresAt: now + this.ttlMs, data });
    data.catch(() => this.entries.delete(key));
    return data;
  }

  clear(): void {
    this.entries.clear();
  }
}
