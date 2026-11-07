import { CalendarDays } from 'lucide-react';
import type { HostSpeech, SeasonBand } from './rankingModel';
import { RankingHost } from './RankingHost';

interface RankingBannerProps {
  band: SeasonBand;
  lead: string;
  speech: HostSpeech;
}

/** Faixa da temporada: nome, prazo e o pet anfitrião. Segue --primary (card principal, D8). */
export function RankingBanner({ band, lead, speech }: RankingBannerProps) {
  return (
    <section className="rk-band" aria-labelledby="rk-title">
      <span className="rk-band-blob" aria-hidden="true" />
      <span className="rk-band-dots" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <div className="rk-band-copy">
        <p className="rk-band-eyebrow">{band.name}</p>
        <h1 id="rk-title" className="rk-display rk-band-title">Ranking</h1>
        <p className="rk-band-lead">{lead}</p>
        <p className="rk-band-chip"><CalendarDays size={18} strokeWidth={2.2} aria-hidden="true" />{band.when}</p>
      </div>
      <RankingHost speech={speech} />
    </section>
  );
}
