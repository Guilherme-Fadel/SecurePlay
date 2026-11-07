import { BookOpen } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { formatNumber, formatXp, ordinal, weeklyLine, type ChaseState, type RaceModel } from './rankingModel';
import { RankingAvatar } from './RankingAvatar';

interface RankingRaceProps {
  race: RaceModel;
  seasonName: string;
  weeklyChange: number | null;
  showActions: boolean;
  showPractice: boolean;
  onContinue: () => void;
  onPractice: () => void;
}

function ChaseText({ chase, seasonName }: { chase: ChaseState; seasonName: string }) {
  switch (chase.kind) {
    case 'neighbor':
      return <p className="rk-race-next">Faltam <strong>{formatXp(chase.gap)}</strong> para passar <span className="rk-race-rival" title={chase.neighbor.name}>{chase.neighbor.name}</span> e chegar ao {ordinal(chase.neighbor.position)} lugar.</p>;
    case 'gap':
      return <p className="rk-race-next">Faltam <strong>{formatXp(chase.gap)}</strong> para você subir uma posição.</p>;
    case 'leader':
      return <p className="rk-race-next">Você está na frente! Continue estudando para manter a liderança.</p>;
    case 'final':
      return <p className="rk-race-next">Posição final na {seasonName}: <strong>{ordinal(chase.position)} lugar</strong>.</p>;
    default:
      return <p className="rk-race-next">A temporada está começando. A primeira aula já coloca você na corrida.</p>;
  }
}

/** "Sua corrida": você e até dois vizinhos de cada lado, derivados da lista recebida (top 50). */
export function RankingRace({ race, seasonName, weeklyChange, showActions, showPractice, onContinue, onPractice }: RankingRaceProps) {
  const week = weeklyLine(weeklyChange);
  return (
    <section className="rk-card rk-race" aria-labelledby="rk-race-title">
      <div className="rk-card-head">
        <h2 id="rk-race-title" className="rk-card-title">Sua corrida</h2>
        <span className="rk-muted">{ordinal(race.viewer.position)} de {formatNumber(race.participants)}</span>
      </div>
      {race.lanes.length > 0 ? (
        <ol className="rk-lanes" aria-label="Você e quem está perto na classificação">
          {race.lanes.map((lane) => {
            const name = lane.me ? 'Você' : lane.entry.name;
            return (
              <li key={lane.entry.id} className={`rk-lane${lane.me ? ' is-me' : ''}`}>
                <span className="rk-lane-pos">{ordinal(lane.entry.position)}</span>
                <span className="rk-lane-track" aria-hidden="true">
                  <span className={`rk-lane-run is-label-${lane.labelSide}`} style={{ left: `${lane.x}%` }}>
                    <RankingAvatar entry={lane.entry} me={lane.me} lazy />
                    <span className="rk-lane-name" title={lane.entry.name}>{name}</span>
                  </span>
                </span>
                <span className="rk-sr">{name}</span>
                <span className="rk-lane-xp">{formatNumber(lane.entry.points)}<span className="rk-sr"> XP</span></span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rk-race-outside"><strong className="rk-display">{ordinal(race.viewer.position)}</strong><span>{formatXp(race.viewer.points)}</span></p>
      )}
      <ChaseText chase={race.chase} seasonName={seasonName} />
      {week && <p className={`rk-race-week is-${week.tone}`}>{week.text}</p>}
      {showActions && (
        <div className="rk-race-actions">
          <AppButton variant="chunky" tone="yellow" icon={<BookOpen size={20} aria-hidden="true" />} onClick={onContinue}>Continuar a trilha</AppButton>
          {showPractice && <button type="button" className="rk-link" onClick={onPractice}>Ou pratique num jogo</button>}
        </div>
      )}
    </section>
  );
}
