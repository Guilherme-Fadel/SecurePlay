import { ArrowRight, RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useDashboardRanking } from '@/hooks/useDashboard';
import type { RankingData, RankingEntry } from '@/services/dashboard';
import { formatNumber } from './homeJourneyModel';

interface HomeRankingProps {
  onContinue: () => void;
  onPractice: () => void;
  onOpenRanking: () => void;
  showPractice: boolean;
}

type BoardRow = { kind: 'gap'; key: string } | { kind: 'row'; key: string; entry: RankingEntry; me: boolean };

const DAY = 86_400_000;

function seasonLine(ranking: RankingData): string | null {
  const season = ranking.season;
  if (!season) return null;
  if (season.status !== 'active') return season.name;
  const days = Math.ceil((Date.parse(season.endsAt) - Date.now()) / DAY);
  if (!Number.isFinite(days)) return season.name;
  const ends = days <= 0 ? 'termina hoje' : days === 1 ? 'termina amanhã' : `termina em ${days} dias`;
  return `${season.name} · ${ends}`;
}

/**
 * Vizinho imediato de cima. O leaderboard vem limitado ao top 50; só vale a
 * entrada cuja distância bate com summary.pointsToNextPosition (calculado sobre
 * todos os alunos), senão a frase fica genérica.
 */
function neighborAbove(ranking: RankingData, me: RankingEntry, isMe: (entry: RankingEntry) => boolean): RankingEntry | null {
  const above = ranking.leaderboard.filter((entry) => !isMe(entry) && entry.points > me.points);
  const candidate = above[above.length - 1] ?? null;
  const gap = ranking.summary.pointsToNextPosition;
  if (!candidate || !gap) return null;
  return candidate.points === me.points + gap - 1 ? candidate : null;
}

/** Top 3; para o aluno, também o vizinho de cima e a própria linha. */
export function rankingRows(ranking: RankingData): { rows: BoardRow[]; neighbor: RankingEntry | null } {
  const me = ranking.viewerParticipates ? ranking.currentUser : null;
  const top = ranking.top.slice(0, 3);
  if (!me) {
    const rows = ranking.leaderboard.slice(0, 5).map((entry) => ({ kind: 'row' as const, key: `r${entry.id}`, entry, me: false }));
    return { rows, neighbor: null };
  }
  const isMe = (entry: RankingEntry) => entry.id === me.id || !!entry.isCurrentUser;
  const rows: BoardRow[] = top.map((entry) => ({ kind: 'row', key: `r${entry.id}`, entry, me: isMe(entry) }));
  const neighbor = neighborAbove(ranking, me, isMe);
  if (top.some(isMe)) return { rows, neighbor };
  const shownIds = new Set(top.map((entry) => entry.id));
  const tail: RankingEntry[] = [];
  if (neighbor && !shownIds.has(neighbor.id)) tail.push(neighbor);
  tail.push(ranking.leaderboard.find(isMe) ?? me);
  let previousPosition = top[top.length - 1]?.position ?? 0;
  tail.forEach((entry) => {
    // Separador sempre que houver posições omitidas entre duas linhas.
    if (entry.position > previousPosition + 1) rows.push({ kind: 'gap', key: `gap-${entry.id}` });
    rows.push({ kind: 'row', key: `r${entry.id}`, entry, me: isMe(entry) });
    previousPosition = entry.position;
  });
  return { rows, neighbor };
}

function weekly(entry: RankingEntry, available: boolean) {
  const change = entry.weeklyChange;
  if (!available || change === null || change === undefined) return { text: '—', label: 'sem dados da semana' };
  if (change > 0) return { text: `▲ ${change}`, label: `subiu ${change} na semana` };
  if (change < 0) return { text: `▼ ${-change}`, label: `caiu ${-change} na semana` };
  return { text: '=', label: 'manteve a posição' };
}

function ChaseLine({ ranking, neighbor }: { ranking: RankingData; neighbor: RankingEntry | null }) {
  const me = ranking.currentUser;
  const gap = ranking.summary.pointsToNextPosition;
  if (!me) return null;
  if (me.position === 1 || !gap) return <p>Você está no topo. Continue estudando para manter o <strong>1º lugar</strong>.</p>;
  if (neighbor) {
    return <p>Faltam <strong>{formatNumber(gap)} XP</strong> para você passar {neighbor.name} e subir para o {neighbor.position}º lugar.</p>;
  }
  return <p>Faltam <strong>{formatNumber(gap)} XP</strong> para você subir uma posição.</p>;
}

function RankingLoading() {
  return <section className="hv-card hv-rank is-loading" aria-busy="true" aria-label="Carregando o ranking"><span className="hv-skeleton is-title" /><span className="hv-skeleton" /><span className="hv-skeleton" /><span className="hv-skeleton" /></section>;
}

function RankingError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="hv-card hv-rank" aria-labelledby="hv-rank-title">
      <div className="hv-rank-head"><div><p className="hv-eyebrow">Temporada</p><h2 id="hv-rank-title" className="hv-display">Ranking da temporada</h2></div></div>
      <p className="hv-muted" role="alert">Não foi possível carregar o ranking.</p>
      <AppButton variant="chunky" tone="ghost" size="sm" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={onRetry}>Tentar novamente</AppButton>
    </section>
  );
}

function RankingTable({ ranking, rows }: { ranking: RankingData; rows: BoardRow[] }) {
  if (rows.length === 0) return <p className="hv-muted">Ninguém pontuou nesta temporada ainda. A primeira aula já coloca você no ranking.</p>;
  const available = ranking.weeklyDataAvailable ?? false;
  return (
    <>
      <div className="hv-cols" aria-hidden="true"><span>Pos.</span><span>Aluno</span><span className="is-end">XP</span><span className="is-end is-week">Semana</span></div>
      <ol className="hv-rows" aria-label="Classificação da temporada">
        {rows.map((row) => {
          if (row.kind === 'gap') return <li key={row.key} className="hv-gap"><span aria-hidden="true">• • •</span><span className="hv-sr">Posições intermediárias omitidas</span></li>;
          const week = weekly(row.entry, available);
          return (
            <li key={row.key} className={`hv-row${row.entry.position === 1 ? ' is-first' : ''}${row.me ? ' is-me' : ''}`}>
              <span className="hv-pos">{row.entry.position}º</span>
              <span className="hv-name"><span>{row.entry.name}</span>{row.me && <span className="hv-tag">VOCÊ</span>}</span>
              <span className="hv-xp-col">{formatNumber(row.entry.points)} XP</span>
              <span className="hv-week-col"><span aria-hidden="true">{week.text}</span><span className="hv-sr">{week.label}</span></span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

interface RankingFooterProps extends HomeRankingProps {
  ranking: RankingData;
  neighbor: RankingEntry | null;
}

/** D14: estudo primeiro — "Continuar a trilha" é a ação principal; Jogos, a secundária. */
function RankingFooter({ ranking, neighbor, onContinue, onPractice, onOpenRanking, showPractice }: RankingFooterProps) {
  const participates = ranking.viewerParticipates && !!ranking.currentUser;
  const up = participates ? ranking.weeklyPositionChange ?? 0 : 0;
  return (
    <div className="hv-rank-foot">
      {participates ? (
        <>
          <ChaseLine ranking={ranking} neighbor={neighbor} />
          {up > 0 && <span className="hv-up">▲ {up} esta semana</span>}
          <div className="hv-rank-actions">
            <AppButton variant="chunky" tone="yellow" size="sm" onClick={onContinue}>Continuar a trilha</AppButton>
            {showPractice && <AppButton variant="chunky" tone="ghost" size="sm" onClick={onPractice}>Praticar num jogo</AppButton>}
          </div>
        </>
      ) : (
        <p><strong>Visão de gestão.</strong> Você acompanha o ranking da escola, sem participar dele.</p>
      )}
      <button type="button" className="hv-link" onClick={onOpenRanking}>Ver ranking completo <ArrowRight size={18} strokeWidth={2.6} aria-hidden="true" /></button>
    </div>
  );
}

/** Ranking da temporada da escola em colunas (Pos., Aluno, XP, Semana). */
export function HomeRanking({ onContinue, onPractice, onOpenRanking, showPractice }: HomeRankingProps) {
  const { ranking, loading, error, refetch } = useDashboardRanking('company');
  // Falha passageira num recarregamento mantém a tabela já carregada.
  if (!ranking) return error && !loading ? <RankingError onRetry={() => refetch()} /> : <RankingLoading />;

  const { rows, neighbor } = rankingRows(ranking);
  const season = seasonLine(ranking);
  const audience = `${formatNumber(ranking.totalParticipants)} ${ranking.totalParticipants === 1 ? 'aluno' : 'alunos'} · ${ranking.company?.name ?? 'sua escola'}`;

  return (
    <section className="hv-card hv-rank" aria-labelledby="hv-rank-title">
      <div className="hv-rank-head">
        <div>{season && <p className="hv-eyebrow">{season}</p>}<h2 id="hv-rank-title" className="hv-display">Ranking da temporada</h2></div>
        <small>{audience}</small>
      </div>
      <RankingTable ranking={ranking} rows={rows} />
      <RankingFooter ranking={ranking} neighbor={neighbor} onContinue={onContinue} onPractice={onPractice} onOpenRanking={onOpenRanking} showPractice={showPractice} />
    </section>
  );
}
