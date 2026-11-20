import type {
  RankingCategory, RankingData, RankingEntry, RankingMode, RankingStats, RankingTurmaEntry, RankingTurmasData, RankingUnit,
} from '@/services/dashboard';
import { formatNumber } from './rankingModel';

/*
 * Categorias, unidades e linhas do placar do Hall da Fama (sem dependências de runtime, testável em Node).
 * O backend é a autoridade de posição, valor e participação. Em "Turmas" o valor é o TOTAL (a soma dos
 * alunos participantes), nunca a média. Aqui só se normalizam as entradas (aluno ou turma) para uma
 * forma única e se montam os textos do palco e do placar.
 */

export const CATEGORY_TABS: ReadonlyArray<{ value: RankingCategory; label: string }> = [
  { value: 'xp', label: 'XP' },
  { value: 'streak', label: 'Sequência' },
  { value: 'challenges', label: 'Desafios' },
];

export const UNIT_TABS: ReadonlyArray<{ value: RankingUnit; label: string }> = [
  { value: 'students', label: 'Alunos' },
  { value: 'turmas', label: 'Turmas' },
];

const plural = (count: number, one: string, many: string) => `${formatNumber(count)} ${count === 1 ? one : many}`;

/** "4.820 XP", "1 dia", "12 dias", "1 desafio", "3 desafios". */
export function valueText(category: RankingCategory, value: number): string {
  if (category === 'streak') return plural(value, 'dia', 'dias');
  if (category === 'challenges') return plural(value, 'desafio', 'desafios');
  return `${formatNumber(value)} XP`;
}

/** Número e unidade da linha ("4.820" + "XP"; "12" + "dias"). */
export function valueParts(category: RankingCategory, value: number): { number: string; unit: string } {
  const text = valueText(category, value);
  const cut = text.indexOf(' ');
  return { number: text.slice(0, cut), unit: text.slice(cut + 1) };
}

/** "dias" vira "dia" quando o valor é 1 (a unidade dos destaques vem do backend no plural); "XP" não muda. */
export function unitFor(value: number, unit: string): string {
  return value === 1 && /[^s]s$/.test(unit) ? unit.slice(0, -1) : unit;
}

/* ---------- Entradas ---------- */

/** Aluno ou turma numa forma só; a turma não traz dados de aluno (nível 0, sem visual). */
export interface BoardEntry extends RankingEntry {
  kind: 'student' | 'turma';
  value: number;
  stats: RankingStats;
  /** Alunos participantes da turma; `null` no aluno. */
  studentCount: number | null;
}

const NO_STATS: RankingStats = { xp: 0, streak: 0, challenges: 0 };

function isTurma(entry: RankingEntry | RankingTurmaEntry): entry is RankingTurmaEntry {
  return 'studentCount' in entry;
}

/** Idempotente: uma entrada já normalizada volta como veio. */
export function toBoardEntry(entry: RankingEntry | RankingTurmaEntry | BoardEntry): BoardEntry {
  if ('kind' in entry) return entry;
  if (isTurma(entry)) {
    return {
      kind: 'turma', rankKey: entry.rankKey, position: entry.position ?? 0, name: entry.name, points: entry.value, level: 0,
      companyName: entry.companyName, isCurrentUser: entry.mine, profileImageUrl: null, weeklyChange: null, look: {},
      value: entry.value, stats: entry.stats, studentCount: entry.studentCount,
    };
  }
  return {
    ...entry, kind: 'student', value: entry.value ?? entry.points,
    stats: entry.stats ?? { ...NO_STATS, xp: entry.points }, studentCount: null,
  };
}

/** A resposta do ranking (de alunos ou de turmas) com todas as entradas normalizadas; o resto segue como veio. */
export function boardRanking(ranking: RankingData | RankingTurmasData): RankingData {
  return {
    ...ranking,
    top: ranking.top.map(toBoardEntry),
    leaderboard: ranking.leaderboard.map(toBoardEntry),
    currentUser: ranking.currentUser ? toBoardEntry(ranking.currentUser) : null,
  };
}

export const categoryOf = (ranking: Pick<RankingData, 'category'>): RankingCategory => ranking.category ?? 'xp';
export const unitOf = (ranking: Pick<RankingData, 'unit'>): RankingUnit => ranking.unit ?? 'students';

/** Os destaques da semana só existem na temporada atual, em XP e entre alunos (o backend não os envia nas outras combinações). */
export function showsWeeklyHighlights(ranking: Pick<RankingData, 'mode' | 'category' | 'unit'>): boolean {
  return ranking.mode === 'current' && categoryOf(ranking) === 'xp' && unitOf(ranking) === 'students';
}

/* ---------- Linha do placar ---------- */

export interface Trend { text: string; tone: 'up' | 'down' | 'plain' }

/** "▲ 2 na semana" / "▼ 1 na semana" quando o backend envia `weeklyChange`; na turma, "total da turma". */
export function rowTrend(entry: BoardEntry): Trend | null {
  if (entry.kind === 'turma') return { text: 'total da turma', tone: 'plain' };
  const change = entry.weeklyChange;
  if (!change) return null;
  return { text: `${change > 0 ? '▲' : '▼'} ${Math.abs(change)} na semana`, tone: change > 0 ? 'up' : 'down' };
}

/** Subtítulo da linha: a escola no escopo global; na turma, "N alunos" e "sua turma". */
export function rowSub(entry: BoardEntry, showCompany: boolean, me: boolean): string | null {
  const company = showCompany && entry.companyName ? entry.companyName : null;
  if (entry.kind === 'student') return company;
  const count = plural(entry.studentCount ?? 0, 'aluno', 'alunos');
  return [company, count, me ? 'sua turma' : null].filter(Boolean).join(' · ');
}

/** Iniciais da turma para o chip ("7º ano B" vira "7B"); sem número, as duas primeiras letras. */
export function turmaChip(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const grade = /\d+/.exec(name)?.[0];
  const letter = [...words].reverse().find((word) => /^[A-Za-zÀ-ú]$/.test(word));
  if (grade && letter) return `${grade}${letter}`.toUpperCase();
  if (grade) return grade;
  return words.slice(0, 2).map((word) => word[0] ?? '').join('').toUpperCase();
}

/** A tendência da semana para o leitor de tela ("subiu 2 posições na semana"); `null` sem variação e na turma. */
export function trendSpeech(entry: BoardEntry): string | null {
  const change = entry.kind === 'turma' ? 0 : entry.weeklyChange ?? 0;
  if (!change) return null;
  return `${change > 0 ? 'subiu' : 'caiu'} ${plural(Math.abs(change), 'posição', 'posições')} na semana`;
}

export interface BoardHead { who: string; level: string; value: string }

/** Cabeçalho de colunas; na turma não há nível e o valor é o total. */
export function boardHead(unit: RankingUnit, category: RankingCategory): BoardHead {
  const value = { xp: 'XP', streak: 'Dias', challenges: 'Desafios' }[category];
  return unit === 'turmas'
    ? { who: 'Turma', level: '', value: `${value} (total)` }
    : { who: 'Aluno', level: 'Nível', value };
}

/* ---------- Placa do palco ---------- */

/** `label` é o rótulo completo; `short` é o usado em palcos estreitos. */
export interface StageStat { key: RankingCategory; label: string; short: string; text: string; on: boolean }

const XP_LABEL: Record<RankingMode, string> = { current: 'XP temporada', season: 'XP final', total: 'XP total' };

/** As três estatísticas do período, com a categoria ativa em destaque; na turma, os totais. */
export function stageStats(entry: BoardEntry, mode: RankingMode, category: RankingCategory): StageStat[] {
  const turma = entry.kind === 'turma';
  const { stats } = entry;
  const items: Array<Omit<StageStat, 'on'>> = [
    { key: 'xp', label: turma ? 'XP' : XP_LABEL[mode], short: 'XP', text: formatNumber(stats.xp) },
    { key: 'streak', label: 'Sequência', short: 'Dias', text: valueText('streak', stats.streak) },
    { key: 'challenges', label: 'Desafios', short: 'Desafios', text: formatNumber(stats.challenges) },
  ];
  return items.map((stat) => ({ ...stat, on: stat.key === category }));
}

/* ---------- Trio de personagens da turma ---------- */

const TRIO_TONES = ['var(--sp-blue)', 'var(--sp-orange)', 'var(--sp-pink)', 'var(--sp-red)'] as const;

/** Cores dos três personagens padrão que representam a turma no palco (esquerda, centro, direita); fixas por turma. */
export function trioTones(rankKey: string): [string, string, string] {
  let hash = 0;
  for (const char of rankKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const tone = (offset: number) => TRIO_TONES[(hash + offset) % TRIO_TONES.length] ?? TRIO_TONES[0];
  return [tone(0), tone(1), tone(2)];
}
