import type { RankingData } from '@/services/dashboard';
import { formatNumber } from './rankingModel';
import { RankingAvatar } from './RankingAvatar';

/** Gestão (admin/platform_admin) acompanha a classificação sem participar. */
export function RankingManagement({ participants, companyName }: { participants: number; companyName: string | null }) {
  return (
    <section className="rk-card rk-manage" aria-labelledby="rk-manage-title">
      <div className="rk-card-head"><h2 id="rk-manage-title" className="rk-card-title">Visão de gestão</h2></div>
      <p className="rk-race-next">Você acompanha a classificação sem participar dela.</p>
      <p className="rk-muted">{formatNumber(participants)} {participants === 1 ? 'aluno' : 'alunos'} nesta classificação{companyName ? ` · ${companyName}` : ''}.</p>
    </section>
  );
}

/** Aluno sem linha nesta classificação (ex.: não participou da temporada encerrada). */
export function RankingNotParticipating() {
  return (
    <section className="rk-card rk-manage" aria-labelledby="rk-absent-title">
      <div className="rk-card-head"><h2 id="rk-absent-title" className="rk-card-title">Sua corrida</h2></div>
      <p className="rk-race-next">Você não aparece nesta classificação.</p>
    </section>
  );
}

/** Destaques da semana: a foto (ou as iniciais) identifica o participante; sem ícones soltos (UI-GUIDELINES). */
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
                <RankingAvatar entry={item.user} me={item.user.isCurrentUser === true && ranking.viewerParticipates} />
                <span className="rk-hl-who"><small>{item.label}</small><strong title={item.user.name}>{item.user.name}</strong></span>
                <span className="rk-hl-value">{formatNumber(item.value)} {item.unit}</span>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
