import type { RankingEntry } from '@/services/dashboard';
import { formatNumber, ordinal, trendOf, type BoardModel } from './rankingModel';
import { RankingAvatar } from './RankingAvatar';

interface RankingBoardProps {
  board: BoardModel;
  subtitle: string;
  showTrend: boolean;
  weeklyAvailable: boolean;
  showCompany: boolean;
  participants: number;
  listLength: number;
}

function BoardRow({ entry, me, showTrend, weeklyAvailable, showCompany }: { entry: RankingEntry; me: boolean; showTrend: boolean; weeklyAvailable: boolean; showCompany: boolean }) {
  const trend = trendOf(entry.weeklyChange, weeklyAvailable);
  const sub = [`Nível ${entry.level}`, showCompany && entry.companyName ? entry.companyName : null].filter(Boolean).join(' · ');
  return (
    <li className={`rk-row${me ? ' is-me' : ''}`}>
      <span className="rk-row-pos">{ordinal(entry.position)}</span>
      <RankingAvatar entry={entry} me={me} lazy />
      <span className="rk-row-who">
        <span className="rk-row-name"><strong title={entry.name}>{entry.name}</strong>{me && <span className="rk-you">Você</span>}</span>
        <small title={sub}>{sub}</small>
      </span>
      {showTrend && <span className={`rk-trend is-${trend.tone}`}><span aria-hidden="true">{trend.text}</span><span className="rk-sr">{trend.label}</span></span>}
      <span className="rk-row-xp">{formatNumber(entry.points)} <small>XP</small></span>
    </li>
  );
}

/** Classificação do 4º em diante; "· · ·" e a sua linha quando você está fora da lista recebida. */
export function RankingBoard({ board, subtitle, showTrend, weeklyAvailable, showCompany, participants, listLength }: RankingBoardProps) {
  const rowProps = { showTrend, weeklyAvailable, showCompany };
  const empty = board.rows.length === 0 && !board.viewerOutside;
  return (
    <section className="rk-card rk-board" aria-labelledby="rk-board-title">
      <div className="rk-card-head"><h2 id="rk-board-title" className="rk-card-title">Classificação</h2><span className="rk-muted">{subtitle}</span></div>
      {empty
        ? <p className="rk-muted rk-board-empty">Todos os participantes desta classificação estão no pódio.</p>
        : (
          <ol className={`rk-rows${showTrend ? '' : ' no-trend'}`} aria-label="Classificação a partir do quarto colocado">
            {board.rows.map(({ entry, me }) => <BoardRow key={entry.id} entry={entry} me={me} {...rowProps} />)}
            {board.viewerOutside && (
              <>
                <li className="rk-skip"><span aria-hidden="true">· · ·</span><span className="rk-sr">Posições intermediárias omitidas</span></li>
                <BoardRow entry={board.viewerOutside} me {...rowProps} />
              </>
            )}
          </ol>
        )}
      {board.truncated && <p className="rk-note">Exibindo os {formatNumber(listLength)} primeiros de {formatNumber(participants)} participantes.</p>}
    </section>
  );
}
