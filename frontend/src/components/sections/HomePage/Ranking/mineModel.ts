import type { RankingData, RankingEntry } from '@/services/dashboard';
import { categoryOf, toBoardEntry, unitOf, valueText, type BoardEntry } from './boardModel';
import { selectedEntry } from './hallModel';
import { formatNumber, isViewerEntry, leaderboardOf, ordinal, viewerOf } from './rankingModel';

/*
 * Texto da barra "Seu ranking" (sem dependências de runtime, testável em Node). O backend é a
 * autoridade de posição, valor e participação: aqui só se escolhe a mensagem e se acha o vizinho
 * de cima na lista que chegou (top 50).
 */

export interface MineBar {
  variant: 'viewer' | 'turma' | 'absent' | 'manage';
  label: string;
  /** "5º", "—" (sem participação) ou, na gestão, a contagem. */
  position: string;
  text: string;
  /** Chave com que o palco recebe o aluno ou a turma (a da lista, que vale também abaixo da 50ª); `null` sem posição. */
  id: string | null;
  entry: BoardEntry | null;
  onStage: boolean;
  /** "Continuar a trilha": some na temporada encerrada e para a gestão. */
  cta: boolean;
}

export interface MineContext {
  /** Professor, admin e platform_admin acompanham sem participar. */
  management: boolean;
  seasonName: string;
}

const MANAGE_TAIL = 'nesta classificação. Você acompanha sem participar: professores e gestores não entram na disputa.';

function plainBar(bar: Pick<MineBar, 'variant' | 'label' | 'position' | 'text' | 'cta'>): MineBar {
  return { ...bar, id: null, entry: null, onStage: false };
}

/** Vizinho imediato de cima; só vale a entrada cuja distância bate com `pointsToNextPosition` (como no Início). */
function neighborAbove(ranking: RankingData, viewer: BoardEntry): BoardEntry | null {
  const gap = ranking.summary?.pointsToNextPosition;
  if (!gap) return null;
  const above = leaderboardOf(ranking).map(toBoardEntry).filter((entry) => !isViewerEntry(entry, viewer) && entry.value > viewer.value);
  const candidate = above[above.length - 1];
  return candidate && candidate.value === viewer.value + gap - 1 ? candidate : null;
}

function studentText(ranking: RankingData, entry: BoardEntry, inList: boolean, seasonName: string): string {
  const value = valueText(categoryOf(ranking), entry.value);
  if (ranking.mode === 'season') return `${value} · posição final na ${seasonName}.`;
  if (entry.position === 1) return `${value} · você está no topo! Continue estudando para manter o lugar.`;
  const gap = ranking.summary?.pointsToNextPosition;
  if (!gap) return value;
  const gapText = valueText(categoryOf(ranking), gap);
  const neighbor = inList ? neighborAbove(ranking, entry) : null;
  return neighbor
    ? `${value} · faltam ${gapText} para passar ${neighbor.name} e chegar ao ${ordinal(neighbor.position)}.`
    : `${value} · faltam ${gapText} para subir uma posição.`;
}

/** Quem está no placar com valor zero na categoria: explica o zero (o aluno existe, só ainda não pontuou). */
function zeroText(ranking: RankingData): string {
  if (unitOf(ranking) === 'turmas') return 'Sua turma ainda não pontuou neste período.';
  const category = categoryOf(ranking);
  if (category === 'streak') return 'Ainda sem sequência de acesso neste período.';
  if (category === 'challenges') return 'Nenhum desafio concluído neste período.';
  if (ranking.mode === 'current') return 'Você ainda não tem XP nesta temporada. A primeira aula já coloca você no placar.';
  return ranking.mode === 'total' ? 'Você ainda não tem XP.' : 'Você não teve XP neste período.';
}

/** Sem linha própria: na turma, é não ter turma; nos alunos, não constar nesta classificação (ex.: temporada em que não participou). */
function missingText(turmas: boolean): string {
  return turmas ? 'Você ainda não está em uma turma.' : 'Você não aparece nesta classificação: não houve participação neste período.';
}

function manageBar(ranking: RankingData): MineBar {
  const total = ranking.totalParticipants;
  const [one, many] = unitOf(ranking) === 'turmas' ? ['turma', 'turmas'] : ['aluno', 'alunos'];
  return plainBar({ variant: 'manage', label: 'Visão de gestão', position: formatNumber(total), text: `${total === 1 ? one : many} ${MANAGE_TAIL}`, cta: false });
}

/** A barra sob o placar: sua posição, turma, zero na categoria, falta de participação ou a visão de gestão. */
export function mineBar(ranking: RankingData, entries: readonly RankingEntry[], selectedId: string | null, context: MineContext): MineBar {
  if (context.management) return manageBar(ranking);
  const turmas = unitOf(ranking) === 'turmas';
  const label = turmas ? 'Sua turma' : 'Seu ranking';
  const cta = ranking.mode !== 'season';
  const viewer = viewerOf(ranking);
  if (!viewer || viewer.position < 1) {
    return plainBar({ variant: 'absent', label, position: '—', text: viewer ? zeroText(ranking) : missingText(turmas), cta });
  }
  const listed = entries.find((item) => isViewerEntry(item, viewer));
  const entry = toBoardEntry(listed ?? viewer);
  const inList = !!listed && leaderboardOf(ranking).some((item) => isViewerEntry(item, viewer));
  const value = valueText(categoryOf(ranking), entry.value);
  const text = turmas
    ? `${entry.name} · ${value} no total da turma.${entry.position === 1 ? ' Sua turma lidera!' : ''}`
    : studentText(ranking, entry, inList, context.seasonName);
  return {
    variant: turmas ? 'turma' : 'viewer', label, position: ordinal(entry.position), text, id: entry.rankKey, entry, cta,
    onStage: selectedEntry(entries, selectedId)?.rankKey === entry.rankKey,
  };
}
