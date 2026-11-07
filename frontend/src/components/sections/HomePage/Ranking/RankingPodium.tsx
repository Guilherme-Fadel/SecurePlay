import { formatXp, ordinal, type PodiumSlot } from './rankingModel';
import { RankingAvatar } from './RankingAvatar';

interface RankingPodiumProps {
  slots: PodiumSlot[];
  metric: string;
  showCompany: boolean;
}

/** Pódio em palco: 2º, 1º, 3º; empates mostram a mesma posição e a mesma altura de degrau. */
export function RankingPodium({ slots, metric, showCompany }: RankingPodiumProps) {
  return (
    <section className="rk-card rk-stage" aria-labelledby="rk-podium-title">
      <div className="rk-card-head"><h2 id="rk-podium-title" className="rk-card-title">Pódio</h2><span className="rk-muted">{metric}</span></div>
      <ol className="rk-podium" aria-label="Três primeiros colocados">
        {slots.map(({ entry, step, order, me }) => {
          const sub = [`Nível ${entry.level}`, showCompany && entry.companyName ? entry.companyName : null].filter(Boolean).join(' · ');
          return (
            <li key={entry.id} className={`rk-pd is-step-${step}${me ? ' is-me' : ''}`} style={{ order }}>
              <div className="rk-pd-who">
                {step === 1 && (
                  <svg className="rk-pd-crown" width="40" height="28" viewBox="0 0 34 24" aria-hidden="true">
                    <path d="M3 20 5 6l7 6 5-9 5 9 7-6 2 14z" fill="var(--sp-yellow)" stroke="var(--sp-black)" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                )}
                <RankingAvatar entry={entry} me={me} className="rk-pd-avatar" />
                <strong className="rk-pd-name" title={entry.name}>{entry.name}</strong>
                {me && <span className="rk-you">Você</span>}
                <span className="rk-pd-xp">{formatXp(entry.points)}</span>
                <span className="rk-pd-sub" title={sub}>{sub}</span>
              </div>
              <div className="rk-pd-step"><span className="rk-display rk-pd-n"><span className="rk-sr">Posição </span>{ordinal(entry.position)}</span></div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
