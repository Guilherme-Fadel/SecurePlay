import { useMemo, type ReactNode } from 'react';
import { ContentLoading } from '@/components/shared/ContentLoading';
import type { RankingData, RankingEntry } from '@/services/dashboard';
import { showsWeeklyHighlights, unitOf } from './boardModel';
import { HallStage } from './HallStage';
import { hallEntries, hallSceneKey } from './hallModel';
import { mineBar } from './mineModel';
import { RankingScoreboard } from './RankingScoreboard';
import { RankingHighlights } from './RankingSide';
import { RankingState } from './RankingStates';
import { leaderboardOf, viewerOf } from './rankingModel';
import type { ScoreboardFiltersProps } from './ScoreboardFilters';
import { scoreboardView } from './scoreboardModel';
import { useHallSelection } from './useHallSelection';

export interface RankingAreaProps {
  filters: ScoreboardFiltersProps;
  /** Já com as entradas normalizadas (`boardRanking`); `null` enquanto carrega ou se falhou. */
  ranking: RankingData | null;
  /** O ranking recebido é o do filtro anterior, enquanto o novo carrega: o palco fecha a cortina e o placar mostra silhuetas. */
  stale: boolean;
  loading: boolean;
  onRetry: () => void;
  waitingForSeason: boolean;
  closedSeasonCount: number;
  hasCompleteClosedSeason: boolean;
  management: boolean;
  seasonName: string;
  onContinue: () => void;
}

function Notices({ ranking, noCompleteSeason }: { ranking: RankingData; noCompleteSeason: boolean }) {
  const historical = ranking.mode !== 'current';
  return (
    <>
      {!ranking.companyAvailable && <p className="rk-notice">Você ainda não faz parte de uma instituição. Exibindo o ranking disponível.</p>}
      {historical && ranking.dataCompleteness === 'partial' && !noCompleteSeason && <p className="rk-notice" role="status">Este histórico é parcial e não representa o resultado completo deste período.</p>}
      {noCompleteSeason && <p className="rk-notice" role="status">Ainda não há temporada encerrada com histórico completo. Os períodos incompletos estão identificados no seletor.</p>}
      {ranking.mode === 'total' && ranking.dataCompleteness === 'unavailable' && <p className="rk-notice" role="status">Os dados deste ranking não estão disponíveis.</p>}
    </>
  );
}

type Status =
  | { kind: 'rows' }
  | { kind: 'loading' }
  /** Sem classificação para mostrar (erro, escolha de temporada, histórico indisponível). */
  | { kind: 'blocked'; node: ReactNode }
  /** Há classificação, mas ninguém pontuou. */
  | { kind: 'empty'; node: ReactNode };

function emptyText(management: boolean, turmas: boolean): string {
  if (management) return turmas ? 'Nenhuma turma pontuou nesta classificação ainda.' : 'Nenhum aluno pontuou nesta classificação ainda.';
  return `Ninguém pontuou nesta classificação ainda. A primeira aula já coloca ${turmas ? 'a sua turma' : 'você'} no ranking.`;
}

/** O que ocupa o lugar da lista do placar. */
function statusOf(props: RankingAreaProps): Status {
  const { ranking, loading, onRetry, waitingForSeason, closedSeasonCount, management } = props;
  if (waitingForSeason) {
    return {
      kind: 'blocked',
      node: (
        <RankingState inline title="Nenhum histórico completo disponível">
          {closedSeasonCount === 0
            ? 'Ainda não há uma temporada encerrada para consultar.'
            : 'Escolha uma temporada encerrada para ver os dados disponíveis. Períodos sem histórico completo são identificados e não aparecem como resultado final.'}
        </RankingState>
      ),
    };
  }
  if (props.stale) return { kind: 'loading' };
  if (!ranking) {
    if (loading) return { kind: 'loading' };
    return { kind: 'blocked', node: <RankingState inline title="Não foi possível carregar o ranking" kind="alert" onRetry={onRetry}>Tente novamente para atualizar a classificação.</RankingState> };
  }
  if (ranking.mode === 'season' && ranking.dataCompleteness === 'unavailable') {
    return { kind: 'blocked', node: <RankingState inline title="Histórico não disponível">Não há dados completos para montar a classificação final desta temporada.</RankingState> };
  }
  if (leaderboardOf(ranking).length === 0) {
    return { kind: 'empty', node: <RankingState inline title="Ainda não há participantes">{emptyText(management, unitOf(ranking) === 'turmas')}</RankingState> };
  }
  return { kind: 'rows' };
}

interface AreaStageProps {
  ranking: RankingData;
  entries: RankingEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sceneKey: string;
  seasonName: string;
  pending: boolean;
}

function AreaStage({ ranking, entries, selectedId, onSelect, sceneKey, seasonName, pending }: AreaStageProps) {
  const view = scoreboardView(ranking, { category: 'xp', unit: 'students' });
  return (
    <HallStage
      entries={entries}
      selectedId={selectedId}
      onSelect={onSelect}
      sceneKey={sceneKey}
      viewerKey={viewerOf(ranking)?.rankKey ?? null}
      scope={ranking.scope}
      mode={ranking.mode}
      category={view.category}
      unit={view.unit}
      seasonLabel={seasonName}
      showCompany={view.showCompany}
      pending={pending}
    />
  );
}

/** O que depende da classificação (o aluno, os avisos e a barra "Seu ranking"); tudo vazio enquanto ela não chegou. */
function extrasOf(props: RankingAreaProps, status: Status, entries: RankingEntry[], selectedId: string | null) {
  const { ranking, management, seasonName } = props;
  if (!ranking || status.kind === 'loading') return { viewer: null, notices: null, mine: null };
  const noCompleteSeason = ranking.mode === 'season' && !props.hasCompleteClosedSeason && props.closedSeasonCount > 0;
  const showMine = status.kind === 'rows' || status.kind === 'empty';
  return {
    viewer: viewerOf(ranking),
    notices: <Notices ranking={ranking} noCompleteSeason={noCompleteSeason} />,
    mine: showMine ? mineBar(ranking, entries, selectedId, { management, seasonName }) : null,
  };
}

/** A classificação que o palco mostra: a da lista ou, carregando outro filtro, a anterior (cortina fechada). */
function stageRanking(status: Status, ranking: RankingData | null): RankingData | null {
  return status.kind === 'rows' || status.kind === 'loading' ? ranking : null;
}

/**
 * Grade da tela: palco (com os destaques da semana logo abaixo, no desktop) e o placar com os filtros.
 * O placar fica sempre no mesmo lugar da árvore (também carregando, com erro ou sem dados), então trocar
 * o filtro não remonta os controles nem tira o foco do teclado.
 */
export function RankingArea(props: RankingAreaProps) {
  const { filters, ranking, seasonName } = props;
  const entries = useMemo(() => (ranking ? hallEntries(ranking) : []), [ranking]);
  const sceneKey = ranking ? hallSceneKey(ranking) : 'none';
  const { selectedId, select } = useHallSelection(sceneKey);
  const status = statusOf(props);
  const view = scoreboardView(ranking, filters);
  const extras = extrasOf(props, status, entries, selectedId);
  // Carregando outro filtro, o palco segue com a classificação anterior (cortina fechada) até a nova chegar.
  const board = stageRanking(status, ranking);
  return (
    <div className={`rk-grid${board ? ' has-board' : ''}${status.kind === 'loading' ? ' is-loading' : ''}`}>
      {board
        ? <AreaStage ranking={board} entries={entries} selectedId={selectedId} onSelect={select} sceneKey={sceneKey} seasonName={seasonName} pending={status.kind === 'loading'} />
        : status.kind === 'loading' && <ContentLoading variant="ranking" />}
      <RankingScoreboard
        {...extras}
        filters={filters}
        refreshing={props.loading}
        category={view.category}
        unit={view.unit}
        onRefresh={props.onRetry}
        entries={entries}
        selectedId={selectedId}
        onSelect={select}
        sceneKey={sceneKey}
        showCompany={view.showCompany}
        subtitle={view.subtitle}
        participants={view.participants}
        listed={view.listed}
        status={status.kind === 'rows' ? null : status.kind === 'loading' ? 'loading' : status.node}
        onContinue={props.onContinue}
      />
      {board && showsWeeklyHighlights(board) && <div className="rk-side"><RankingHighlights ranking={board} /></div>}
    </div>
  );
}
