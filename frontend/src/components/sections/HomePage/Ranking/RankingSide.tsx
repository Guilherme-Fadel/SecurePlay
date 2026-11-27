import type { RankingData } from '@/services/dashboard';
import { unitFor } from './boardModel';
import { formatNumber } from './rankingModel';
import { RankingPet } from './RankingPet';

/** Destaques da semana: o personagem identifica o participante; sem ícones soltos (UI-GUIDELINES). */
export function RankingHighlights({ ranking }: { ranking: RankingData }) {
  const highlights = ranking.weeklyHighlights ?? [];
  return (
    <section className="rk-card rk-highlights" aria-labelledby="rk-highlights-title">
      <div className="rk-card-head"><h2 id="rk-highlights-title" className="rk-card-title">Destaques da semana</h2></div>
      {highlights.length === 0
        ? <p className="rk-muted">{ranking.weeklyDataAvailable ? 'Nenhuma atividade nesta semana.' : 'Dados semanais indisponíveis.'}</p>
        : (
          <ul className="rk-hl">
            {highlights.map((item) => (
              <li key={item.kind}>
                <RankingPet className="rk-hl-pet" rankKey={item.user.rankKey} look={item.user.look} me={item.user.isCurrentUser === true && ranking.viewerParticipates} />
                <span className="rk-hl-who"><small>{item.label}</small><strong title={item.user.name}>{item.user.name}</strong></span>
                <span className="rk-hl-value">{formatNumber(item.value)} {unitFor(item.value, item.unit)}</span>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
