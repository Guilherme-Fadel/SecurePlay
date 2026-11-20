import type { CharacterLook, RankingCategory, RankingData, RankingEntry, RankingMode, RankingUnit } from '@/services/dashboard';
import { cardTheme, stageTheme, type ThemeView } from '../Awards/characterModel';
import { categoryOf, toBoardEntry, trioTones, unitOf, valueText } from './boardModel';
import { isViewerEntry, leaderboardOf, ordinal, viewerOf } from './rankingModel';

/*
 * Regras do palco do Hall da Fama (sem dependências de runtime, testável em Node).
 * O backend é a autoridade de posição, XP e participação: aqui só se escolhe quem
 * aparece no palco, como o pedestal e o card se vestem e o que o leitor de tela ouve.
 */

/** Quem pode subir ao palco: a lista recebida (top 50) e, abaixo dela, o próprio aluno no fim. */
export function hallEntries(ranking: RankingData): RankingEntry[] {
  const list = leaderboardOf(ranking);
  const viewer = viewerOf(ranking);
  const outside = viewer && !list.some((entry) => isViewerEntry(entry, viewer));
  return viewer && outside ? [...list, viewer] : list;
}

/**
 * Identifica o "espetáculo": escopo, período, temporada, instituição, categoria e unidade. Muda com
 * o filtro (a cortina fecha e reabre) e não com a atualização dos mesmos dados.
 */
export function hallSceneKey(ranking: RankingData): string {
  return [ranking.scope, ranking.mode, ranking.selectedSeason ?? 'atual', ranking.company?.id ?? 'self', categoryOf(ranking), unitOf(ranking)].join('|');
}

/** Em destaque: a escolhida, se ainda estiver na lista; senão o 1º colocado. */
export function selectedEntry(entries: readonly RankingEntry[], selectedId: string | null): RankingEntry | null {
  return entries.find((entry) => entry.rankKey === selectedId) ?? entries[0] ?? null;
}

function indexOfSelected(entries: readonly RankingEntry[], selectedId: string | null): number {
  const index = entries.findIndex((entry) => entry.rankKey === selectedId);
  return index < 0 ? 0 : index;
}

/** Vizinho anterior (-1) ou próximo (+1) do destaque; nas pontas, fica onde está. */
export function stepEntry(entries: readonly RankingEntry[], selectedId: string | null, delta: -1 | 1): string | null {
  if (entries.length === 0) return null;
  const index = indexOfSelected(entries, selectedId);
  const target = Math.min(entries.length - 1, Math.max(0, index + delta));
  return entries[target]?.rankKey ?? null;
}

export function canStep(entries: readonly RankingEntry[], selectedId: string | null, delta: -1 | 1): boolean {
  if (entries.length === 0) return false;
  const target = indexOfSelected(entries, selectedId) + delta;
  return target >= 0 && target < entries.length;
}

/* ---------- Pedestal ---------- */

export type PedestalTier = 'gold' | 'silver' | 'bronze' | 'plain';

/** Pela posição do backend: empates dividem o estilo; da 4ª em diante, neutro. */
export function pedestalTier(position: number): PedestalTier {
  if (position === 1) return 'gold';
  if (position === 2) return 'silver';
  if (position === 3) return 'bronze';
  return 'plain';
}

/** Número gravado no pedestal; encolhe para caber com 2 e 3 dígitos. */
export function pedestalLabel(position: number): { text: string; size: number } {
  return { text: ordinal(position), size: position < 10 ? 40 : position < 100 ? 34 : 28 };
}

/* ---------- Tema do aluno ---------- */

export interface HallTheme { stage: ThemeView; card: ThemeView }

/** Fundo do palco e tema do card equipados; sem eles, o palco padrão e o card clássico. */
export function hallTheme(look: CharacterLook | undefined): HallTheme {
  return { stage: stageTheme(look?.background), card: cardTheme(look?.card) };
}

/** O aluno em destaque é o próprio aluno logado (gestão não participa, então nunca é "você"). */
export function isHallMe(entry: RankingEntry, viewerKey: string | null): boolean {
  return entry.isCurrentUser === true || (viewerKey !== null && entry.rankKey === viewerKey);
}

/** Classes do palco: metais do pedestal pela posição, fundo equipado, luzes da ribalta e, com a cortina fechando, o elenco por baixo dela. */
export function hallStageClass(position: number, theme: HallTheme, state: { lit: boolean; covered?: boolean }): string {
  return ['hall-stage', `hall-tier--${pedestalTier(position)}`, theme.stage.className, state.lit ? 'is-lit' : '', state.covered ? 'is-covered' : ''].filter(Boolean).join(' ');
}

export type StagePhase = 'closed' | 'opening' | 'closing' | 'open';

export interface StageFlags {
  /** Elenco (selo, setas, placa) e botão de cutucar montados: abrindo, aberta ou fechando (por baixo da cortina). */
  mounted: boolean;
  /** Cortina aberta: só então o elenco recebe foco, toque e o teclado do palco. */
  live: boolean;
  /** Setas habilitadas (desde a abertura; o foco e o toque seguem vedados até `live`). */
  steps: boolean;
  /** O leitor de tela anuncia quem está no palco. */
  announce: boolean;
}

/** O que a fase da cortina permite: com ela fechada ou fechando, nada do palco é tocável nem lido. */
export function stageFlags(phase: StagePhase): StageFlags {
  const live = phase === 'open';
  const opening = phase === 'opening';
  return { mounted: opening || live || phase === 'closing', live, steps: opening || live, announce: opening || live };
}

/** Cores do trio de personagens que representa a turma no palco; `null` para o aluno (que tem o próprio personagem). */
export function hallTrio(entry: RankingEntry): [string, string, string] | null {
  return toBoardEntry(entry).kind === 'turma' ? trioTones(entry.rankKey) : null;
}

/** Nome acessível do botão de cutucar (some o personagem do aluno, o seu ou o trio da turma). */
export function hallPokeLabel(entry: RankingEntry, me: boolean): string {
  if (toBoardEntry(entry).kind === 'turma') return `Cutucar os personagens da turma ${entry.name}`;
  return me ? 'Cutucar o seu personagem' : `Cutucar o personagem de ${entry.name}`;
}

/* ---------- Textos ---------- */

const SCOPE_TEXT: Record<RankingUnit, Record<RankingData['scope'], string>> = {
  students: { global: 'entre todas as escolas', company: 'na sua escola' },
  turmas: { global: 'entre todas as turmas', company: 'entre as turmas da escola' },
};
const MODE_SUFFIX: Record<RankingMode, string> = { current: '', season: ' · final', total: ' · geral' };

export const hallScopeText = (scope: RankingData['scope'], unit: RankingUnit = 'students') => SCOPE_TEXT[unit][scope];

/** Selo "Nº lugar" do canto do palco e sua legenda (o texto do escopo do canvas). */
export function hallBadge(position: number, scope: RankingData['scope'], mode: RankingMode, unit: RankingUnit = 'students'): { number: string; caption: string } {
  return { number: ordinal(position), caption: `${hallScopeText(scope, unit)}${MODE_SUFFIX[mode]}` };
}

/** Confete só quando o 1º colocado sobe ao palco. */
export function celebrates(position: number): boolean {
  return position === 1;
}

/** Selo da placa: a instituição na classificação global; nos demais casos, o nível (aluno) ou "N alunos" (turma). */
export function hallPill(entry: RankingEntry, showCompany: boolean): string {
  if (showCompany && entry.companyName) return entry.companyName;
  const board = toBoardEntry(entry);
  if (board.kind === 'turma') return `${board.studentCount} ${board.studentCount === 1 ? 'aluno' : 'alunos'}`;
  return `Nível ${entry.level}`;
}

/** Anúncio educado do leitor de tela quando o destaque muda. */
export function hallAnnouncement(entry: RankingEntry, me: boolean, scopeText: string, category: RankingCategory = 'xp'): string {
  const board = toBoardEntry(entry);
  const who = !me ? entry.name : board.kind === 'turma' ? `sua turma, ${entry.name}` : 'você';
  return `No palco: ${who}, ${ordinal(entry.position)} lugar ${scopeText}, ${valueText(category, board.value)}${board.kind === 'turma' ? ' no total da turma' : ''}.`;
}

/** Nome acessível dos botões de seta: diz para quem o palco vai. */
export function hallStepLabel(name: string | null, delta: -1 | 1, turmas = false): string {
  if (turmas) {
    if (name === null) return delta < 0 ? 'Não há turma anterior' : 'Não há próxima turma';
    return `Levar ao palco ${delta < 0 ? 'a turma anterior' : 'a próxima turma'}: ${name}`;
  }
  if (name === null) return delta < 0 ? 'Não há aluno anterior' : 'Não há próximo aluno';
  return `Levar ao palco o ${delta < 0 ? 'aluno anterior' : 'próximo aluno'}: ${name}`;
}

/* ---------- Confete ---------- */

export interface ConfettiPiece { left: number; color: string; delay: number; duration: number }

/** Quatorze pedaços do canvas aprovado, com as cores da paleta fixa da marca. */
export const CONFETTI: readonly ConfettiPiece[] = [
  { left: 22, color: 'var(--sp-yellow)', delay: 0, duration: 2.2 },
  { left: 30, color: 'var(--sp-pink)', delay: 0.15, duration: 2.6 },
  { left: 38, color: 'var(--sp-cream)', delay: 0.3, duration: 2.1 },
  { left: 45, color: 'var(--sp-orange)', delay: 0.05, duration: 2.5 },
  { left: 52, color: 'var(--sp-yellow)', delay: 0.4, duration: 2.3 },
  { left: 58, color: 'var(--sp-blue)', delay: 0.2, duration: 2.7 },
  { left: 64, color: 'var(--sp-pink)', delay: 0.5, duration: 2.2 },
  { left: 70, color: 'var(--sp-cream)', delay: 0.1, duration: 2.4 },
  { left: 76, color: 'var(--sp-yellow)', delay: 0.35, duration: 2.6 },
  { left: 34, color: 'var(--sp-orange)', delay: 0.65, duration: 2.3 },
  { left: 48, color: 'var(--sp-red)', delay: 0.75, duration: 2.1 },
  { left: 62, color: 'var(--sp-yellow)', delay: 0.85, duration: 2.5 },
  { left: 26, color: 'var(--sp-blue)', delay: 0.9, duration: 2.4 },
  { left: 72, color: 'var(--sp-orange)', delay: 1, duration: 2.2 },
];
