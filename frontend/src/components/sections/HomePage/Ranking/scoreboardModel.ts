import type { RankingCategory, RankingData, RankingEntry, RankingUnit } from '@/services/dashboard';
import { cardTheme, type ThemeView } from '../Awards/characterModel';
import { categoryOf, toBoardEntry, trendSpeech, unitOf, valueText } from './boardModel';
import { formatNumber, leaderboardOf, ordinal } from './rankingModel';

/*
 * Regras do placar do Hall da Fama (sem dependências de runtime, testável em Node).
 * O backend é a autoridade de posição, XP e participação: aqui só se pagina a lista que
 * já chegou e se escolhe a página do aluno em destaque (a barra "Seu ranking" está em mineModel).
 */

export const SCOREBOARD_PAGE_SIZE = 8;

/** Sempre ao menos uma página, mesmo sem alunos. */
export function scoreboardPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / SCOREBOARD_PAGE_SIZE));
}

export function clampScoreboardPage(page: number, total: number): number {
  return Math.min(scoreboardPageCount(total) - 1, Math.max(0, page));
}

/** Os alunos de uma página (vazia se a página não existe). */
export function scoreboardRows(entries: readonly RankingEntry[], page: number): RankingEntry[] {
  return entries.slice(page * SCOREBOARD_PAGE_SIZE, (page + 1) * SCOREBOARD_PAGE_SIZE);
}

/** Página onde está o aluno; sem destaque ou com id desconhecido, a primeira. */
export function scoreboardPageOf(entries: readonly RankingEntry[], id: string | null): number {
  const index = entries.findIndex((entry) => entry.rankKey === id);
  return index < 0 ? 0 : Math.floor(index / SCOREBOARD_PAGE_SIZE);
}

/** Página escolhida à mão e o destaque (com a cena) em que ela foi escolhida. */
export interface ScoreboardPick { anchor: string; page: number }

/**
 * A página acompanha o destaque: ao subir outro aluno ao palco (setas, clique ou "Ver no palco")
 * ou ao mudar a cena, o placar vai para a página dele. A escolha manual vale enquanto o destaque
 * (`anchor`) for o mesmo em que foi feita.
 */
export function resolveScoreboardPage(entries: readonly RankingEntry[], selectedId: string | null, pick: ScoreboardPick | null, anchor: string): number {
  const page = pick && pick.anchor === anchor ? pick.page : scoreboardPageOf(entries, selectedId);
  return clampScoreboardPage(page, entries.length);
}

export function scoreboardPageLabel(page: number, total: number): string {
  return `Página ${page + 1} de ${total}`;
}

/**
 * Linha de apoio do rodapé: a faixa mostrada ou, quando o backend cortou a lista (mais
 * participantes do que `listed`), o corte. `shown` conta também o aluno abaixo do corte.
 */
export function scoreboardInfo(page: number, shown: number, listed: number, participants: number): string {
  if (shown === 0) return '';
  if (participants > listed) return `Top ${formatNumber(listed)} de ${formatNumber(participants)}`;
  const first = page * SCOREBOARD_PAGE_SIZE + 1;
  const last = Math.min(shown, (page + 1) * SCOREBOARD_PAGE_SIZE);
  return `Mostrando ${first} a ${last} de ${shown}`;
}

/** Instituição do aluno, só na classificação global (onde ela situa a linha); o mesmo dado que o placar antigo já exibia. */
export function scoreboardCompany(entry: RankingEntry, showCompany: boolean): string | null {
  return showCompany && entry.companyName ? entry.companyName : null;
}

export interface RowState {
  /** A linha é a do aluno logado (ou da turma dele). */
  me: boolean;
  onStage: boolean;
  /** Classificação global: o nome acessível inclui a instituição. */
  showCompany?: boolean;
  category?: RankingCategory;
}

/** Nome acessível da linha: posição, quem é, instituição (global), nível, valor da categoria (na turma, o total), tendência da semana e o que o toque faz. */
export function scoreboardRowLabel(entry: RankingEntry, state: RowState): string {
  const { me, onStage, showCompany = false, category = 'xp' } = state;
  const board = toBoardEntry(entry);
  const turma = board.kind === 'turma';
  const who = !me ? entry.name : turma ? `${entry.name}, sua turma` : 'você';
  const value = `${valueText(category, board.value)}${turma ? ' no total da turma' : ''}`;
  const parts = [who, scoreboardCompany(entry, showCompany), turma ? null : `nível ${board.level}`, value, trendSpeech(board)];
  return `${ordinal(entry.position)} lugar, ${parts.filter(Boolean).join(', ')}. ${onStage ? 'No palco' : 'Levar ao palco'}`;
}

/** Tema do card equipado (cor, ou arte enviada); o clássico é a linha comum. */
export function scoreboardRowTheme(entry: RankingEntry): ThemeView | null {
  const theme = cardTheme(entry.look?.card);
  return theme.className === 'chr-card--classico' ? null : theme;
}

export interface ScoreboardView {
  category: RankingCategory;
  unit: RankingUnit;
  showCompany: boolean;
  /** "Escola · 3.000 participantes" (ou turmas). */
  subtitle: string;
  participants: number;
  /** Quantas linhas o backend mandou (o corte). */
  listed: number;
}

/** O que o cartão do placar mostra: categoria e unidade da resposta (ou as dos filtros, sem resposta) e o cabeçalho. */
export function scoreboardView(ranking: RankingData | null, fallback: { category: RankingCategory; unit: RankingUnit }): ScoreboardView {
  if (!ranking) return { ...fallback, showCompany: false, subtitle: 'Minha escola', participants: 0, listed: 0 };
  const unit = unitOf(ranking);
  const total = ranking.totalParticipants;
  const [one, many] = unit === 'turmas' ? ['turma', 'turmas'] : ['participante', 'participantes'];
  const audience = ranking.scope === 'global' ? 'Todas as escolas' : ranking.company?.name ?? 'Minha escola';
  return {
    category: categoryOf(ranking),
    unit,
    showCompany: ranking.scope === 'global',
    subtitle: `${audience} · ${formatNumber(total)} ${total === 1 ? one : many}`,
    participants: total,
    listed: leaderboardOf(ranking).length,
  };
}
