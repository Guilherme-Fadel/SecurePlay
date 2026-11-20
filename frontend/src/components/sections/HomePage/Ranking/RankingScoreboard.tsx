import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import type { RankingCategory, RankingEntry, RankingUnit } from '@/services/dashboard';
import { boardHead } from './boardModel';
import { selectedEntry } from './hallModel';
import type { MineBar } from './mineModel';
import { ScoreboardFilters, type ScoreboardFiltersProps } from './ScoreboardFilters';
import { ScoreboardMine } from './ScoreboardMine';
import { ScoreboardPager } from './ScoreboardPager';
import { ScoreboardRow } from './ScoreboardRow';
import { isViewerEntry } from './rankingModel';
import { scoreboardInfo, scoreboardRows } from './scoreboardModel';
import { useScoreboardPage } from './useScoreboardPage';

export interface RankingScoreboardProps {
  filters: ScoreboardFiltersProps;
  refreshing: boolean;
  /** Categoria e unidade das linhas mostradas (as da resposta, que podem ainda não ser as dos filtros). */
  category: RankingCategory;
  unit: RankingUnit;
  onRefresh: () => void;
  entries: RankingEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sceneKey: string;
  /** Linha do aluno logado quando ele participa; gestão passa `null`. */
  viewer: RankingEntry | null;
  /** Classificação global: cada linha mostra a instituição. */
  showCompany: boolean;
  /** "Instituição · N participantes". */
  subtitle: string;
  participants: number;
  /** Quantos vieram na lista do backend (o corte); o aluno abaixo dele entra à parte. */
  listed: number;
  /** Avisos do período (histórico parcial, sem instituição...), dentro do cartão como no canvas. */
  notices: ReactNode;
  /** Sem lista: `'loading'` mostra as linhas em silhueta; um nó (erro, vazio, escolha de temporada) ocupa o lugar da lista. */
  status: ReactNode;
  mine: MineBar | null;
  onContinue: () => void;
}

function Skeleton() {
  return (
    <div className="sb-list sb-skels" role="status" aria-label="Carregando placar">
      {Array.from({ length: 8 }, (_, index) => <div key={index} className="sb-skel" aria-hidden="true" />)}
    </div>
  );
}

/**
 * Placar do Hall da Fama (canvas `hf-board`): filtros, cabeçalho de colunas e a lista de 8 em 8, com o
 * personagem de cada aluno. Clicar numa linha leva o aluno ao palco. O cartão e os filtros ficam
 * sempre montados (também carregando ou com erro); a barra "Seu ranking" vem logo abaixo.
 */
export function RankingScoreboard(props: RankingScoreboardProps) {
  const { filters, entries, selectedId, onSelect, sceneKey, viewer, showCompany, subtitle, participants, listed, status, mine } = props;
  const { page, pages, go } = useScoreboardPage(entries, selectedId, sceneKey);
  const onStageId = selectedEntry(entries, selectedId)?.rankKey ?? null;
  const head = boardHead(props.unit, props.category);
  const hasRows = status === null;
  return (
    <section className="sb" aria-labelledby="sb-title" aria-busy={status === 'loading' || undefined}>
      <div className="rk-card sb-card">
        <div className="rk-card-head">
          <h2 id="sb-title" className="rk-card-title">Placar</h2>
          <span className="rk-muted">{subtitle}</span>
          <button className="sb-refresh" type="button" onClick={props.onRefresh} disabled={props.refreshing} aria-label="Atualizar ranking" title="Atualizar ranking">
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>
        <ScoreboardFilters {...filters} />
        {props.notices}
        {hasRows && (
          <>
            <div className="sb-head" aria-hidden="true"><span>Pos.</span><span /><span>{head.who}</span><span>{head.level}</span><span>{head.value}</span></div>
            <ol className={`sb-list${pages > 1 ? ' has-pages' : ''}`} aria-label={`Placar, página ${page + 1} de ${pages}`}>
              {scoreboardRows(entries, page).map((entry) => (
                <ScoreboardRow
                  key={entry.rankKey}
                  entry={entry}
                  category={props.category}
                  me={isViewerEntry(entry, viewer)}
                  onStage={entry.rankKey === onStageId}
                  showCompany={showCompany}
                  onSelect={onSelect}
                />
              ))}
            </ol>
            <ScoreboardPager page={page} pages={pages} info={scoreboardInfo(page, entries.length, listed, participants)} onGo={go} />
          </>
        )}
        {status === 'loading' ? <Skeleton /> : !hasRows && status}
      </div>
      {mine && <ScoreboardMine mine={mine} onSelect={onSelect} onContinue={props.onContinue} />}
    </section>
  );
}
