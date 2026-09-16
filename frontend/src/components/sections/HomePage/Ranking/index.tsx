import { useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Building2, CalendarDays, Crown, Flame, Globe2, Medal, RefreshCw, Shield, Sparkles, Trophy, Zap } from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { Avatar } from '@/components/ui/visuals/Avatar';
import { useDashboardRanking } from '@/hooks/useDashboard';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import type { RankingData, RankingEntry } from '@/services/dashboard';
import galleryEmblem from '@/assets/static/mission-room/missions-room-emblem.png';
import hallArtwork from '@/assets/static/ranking/ranking-gallery-hall-v1.webp';
import landscapeArtwork from '@/assets/static/ranking/ranking-sunset-landscape-v1.webp';
import firstBanner from '@/assets/static/ranking/ranking-banner-first-v1.svg';
import secondBanner from '@/assets/static/ranking/ranking-banner-second-v1.svg';
import thirdBanner from '@/assets/static/ranking/ranking-banner-third-v1.svg';
import '@/styles/ranking-ui.css';

type RankingScope = 'global' | 'company';
const formatXp = (value: number) => `${value.toLocaleString('pt-BR')} XP`;
const bannerByPosition = [firstBanner, secondBanner, thirdBanner];

function seasonLabel(season: RankingData['season']) {
  if (!season) return 'Temporada não configurada';
  const now = Date.now();
  const startsAt = new Date(season.startsAt).getTime();
  const endsAt = new Date(season.endsAt).getTime();
  if (now < startsAt) return `${season.name} • começa em ${Math.ceil((startsAt - now) / 86400000)} dias`;
  if (now < endsAt) return `${season.name} • ${Math.ceil((endsAt - now) / 86400000)} dias restantes`;
  return `${season.name} encerrada`;
}

export function Ranking() {
  const features = useCompanyFeatures();
  const [scope, setScope] = useState<RankingScope>(features.globalRanking ? 'global' : 'company');
  const effectiveScope = features.globalRanking ? scope : 'company';
  return <RankingContent key={effectiveScope} scope={effectiveScope} onScopeChange={setScope} />;
}

function RankingContent({ scope, onScopeChange }: { scope: RankingScope; onScopeChange: (scope: RankingScope) => void }) {
  const features = useCompanyFeatures();
  const { ranking, loading, error, refetch } = useDashboardRanking(scope);
  const scopeLabel = ranking?.scope === 'company' ? 'Minha instituição' : 'Global';
  const season = ranking?.season;

  return (
    <PageTransition>
      <div className="app-page ranking-page">
        <header className="ranking-heading">
          <div className="ranking-title-group">
            <img src={galleryEmblem} alt="" width={56} height={56} />
            <div><h1>Galeria de Honra</h1><p>Cada aprendizado faz parte da sua conquista.</p></div>
          </div>
          <div className="ranking-toolbar">
            <div className="ranking-scope-switch" role="group" aria-label="Escopo do ranking">
              {features.globalRanking && <button type="button" aria-pressed={scope === 'global'} onClick={() => onScopeChange('global')}><Globe2 size={17} />Global</button>}
              <button type="button" aria-pressed={scope === 'company'} onClick={() => onScopeChange('company')} disabled={!!ranking && !ranking.companyAvailable && scope !== 'company'}><Building2 size={17} />Minha instituição</button>
            </div>
            <div className="ranking-season-pill" title={season ? undefined : 'Nenhuma temporada configurada'}><CalendarDays size={17} />{seasonLabel(season)}</div>
            <button className="ranking-refresh" type="button" onClick={refetch} disabled={loading} aria-label="Atualizar ranking" title="Atualizar ranking"><RefreshCw size={17} /></button>
          </div>
        </header>
        {loading && !ranking ? <div className="ranking-status" role="status">Carregando a Galeria de Honra…</div> :
          error || !ranking ? <div className="ranking-status" role="alert"><h2>Não foi possível carregar o ranking</h2><p>Tente novamente para atualizar a classificação.</p><AppButton onClick={refetch}>Tentar novamente</AppButton></div> :
          <div className="ranking-content">
            {!ranking.companyAvailable && <p className="ranking-scope-hint">Você ainda não faz parte de uma instituição. Exibindo o ranking disponível.</p>}
            <RankingHero top={ranking.top} scopeLabel={scopeLabel} />
            <div className="ranking-content-grid">
              <JourneyCard ranking={ranking} />
              <WeeklyHighlights ranking={ranking} />
              <RankingSection ranking={ranking} scopeLabel={scopeLabel} />
              <div className="ranking-landscape" role="img" aria-label="Castelo em um vale ao pôr do sol"><img src={landscapeArtwork} alt="" /></div>
            </div>
          </div>}
      </div>
    </PageTransition>
  );
}

function RankingHero({ top, scopeLabel }: { top: RankingEntry[]; scopeLabel: string }) {
  return <section className="ranking-hero" aria-label={`Galeria de Honra — ${scopeLabel}`}>
    <img className="ranking-hero-art" src={hallArtwork} alt="" />
    <div className="ranking-hero-light" aria-hidden="true" />
    <div className="ranking-podium" role="list" aria-label="Três primeiros colocados">
      {top.slice(0, 3).map((entry, index) => <LeaderBanner key={entry.id} entry={entry} place={index + 1} />)}
    </div>
    {top.length === 0 && <p className="ranking-hero-empty">A galeria está esperando seus primeiros participantes.</p>}
  </section>;
}

function LeaderBanner({ entry, place }: { entry: RankingEntry; place: number }) {
  return <div className={`ranking-leader ranking-leader-${place}`} role="listitem" aria-label={`${entry.position}º lugar: ${entry.name}, ${formatXp(entry.points)}`}>
    <img className="ranking-leader-art" src={bannerByPosition[place - 1]} alt="" />
    {place === 1 && <Crown className="ranking-leader-crown" size={32} aria-hidden="true" />}
    <span className="ranking-leader-medal">{entry.position}</span>
    <Avatar name={entry.name} imageUrl={entry.profileImageUrl} className="ranking-leader-avatar" />
    <span className="ranking-leader-details"><strong title={entry.name}>{entry.name}</strong><b>{formatXp(entry.points)}</b></span>
  </div>;
}

function JourneyCard({ ranking }: { ranking: RankingData }) {
  const user = ranking.currentUser;
  const gap = ranking.summary.pointsToNextPosition;
  const progress = gap > 0 ? Math.min(100, Math.round(user.points / (user.points + gap) * 100)) : user.points > 0 ? 100 : 0;
  const change = ranking.weeklyPositionChange;
  return <section className="ranking-card ranking-journey" aria-labelledby="ranking-journey-title">
    <div className="ranking-card-heading"><span className="ranking-card-icon"><BookOpen size={25} /></span><div><h2 id="ranking-journey-title">Sua Jornada</h2><p>Continue aprendendo. Você está mais perto da próxima posição!</p></div></div>
    <div className="ranking-journey-panel">
      <div className="ranking-journey-identity"><div><small>Sua posição</small><strong className="ranking-journey-position">#{user.position}</strong></div><Avatar name={user.name} imageUrl={user.profileImageUrl} className="ranking-journey-avatar" /><div className="ranking-journey-name"><strong title={user.name}>{user.name}</strong><span><Shield size={13} /> Nv. {user.level}</span></div></div>
      <div className="ranking-journey-progress">
        <div className="ranking-journey-movement">{change == null ? <span className="is-neutral">Variação semanal indisponível</span> : change > 0 ? <span className="is-up"><ArrowUp size={17} /> {change} {change === 1 ? 'posição' : 'posições'} esta semana</span> : change < 0 ? <span className="is-down"><ArrowDown size={17} /> {Math.abs(change)} {change === -1 ? 'posição' : 'posições'} esta semana</span> : <span className="is-neutral">Posição estável esta semana</span>}</div>
        <div className="ranking-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso até a próxima posição"><span style={{ width: `${progress}%` }} /></div>
        <small>{gap > 0 ? `${gap.toLocaleString('pt-BR')} XP para alcançar #${user.position - 1}` : user.points === 0 ? 'A temporada está começando' : 'Você está na liderança desta classificação'}</small>
      </div>
      <strong className="ranking-journey-xp"><Medal size={19} /><span><b>{formatXp(user.points)}</b><small>na temporada</small></span></strong>
    </div>
  </section>;
}

const highlightIcons = { streak: Flame, xp: Zap, challenges: Shield };
function WeeklyHighlights({ ranking }: { ranking: RankingData }) {
  const byKind = new Map(ranking.weeklyHighlights?.map(item => [item.kind, item]));
  return <section className="ranking-card ranking-highlights" aria-labelledby="ranking-highlights-title">
    <div className="ranking-card-heading"><span className="ranking-card-icon is-gold"><Trophy size={25} /></span><div><h2 id="ranking-highlights-title">Destaques da semana</h2><p>Realizações que inspiram nossa comunidade.</p></div></div>
    <div className="ranking-highlights-list">
      {(['streak', 'xp', 'challenges'] as const).map(kind => {
        const item = byKind.get(kind);
        const Icon = highlightIcons[kind];
        const label = kind === 'streak' ? 'Maior sequência' : kind === 'xp' ? 'Mais XP conquistado' : 'Mais desafios';
        return <div className="ranking-highlight" key={kind}><Icon size={18} className={`ranking-highlight-icon is-${kind}`} /><span className="ranking-highlight-label">{item?.label ?? label}</span>{item ? <><Avatar name={item.user.name} imageUrl={item.user.profileImageUrl} className="ranking-highlight-avatar" /><strong title={item.user.name}>{item.user.name}</strong><b>{item.value.toLocaleString('pt-BR')} {item.unit}</b></> : <small>{ranking.weeklyDataAvailable ? 'Nenhuma atividade nesta semana' : 'Dados semanais indisponíveis'}</small>}</div>;
      })}
    </div>
  </section>;
}

function RankingSection({ ranking, scopeLabel }: { ranking: RankingData; scopeLabel: string }) {
  const rest = (ranking.leaderboard ?? ranking.top).slice(3);
  return <section className="ranking-card ranking-classification" aria-labelledby="ranking-classification-title">
    <div className="ranking-card-heading"><span className="ranking-card-icon is-chart"><Sparkles size={24} /></span><div><h2 id="ranking-classification-title">Classificação</h2><p>Veja quem está subindo no ranking {scopeLabel === 'Global' ? 'global' : 'da sua instituição'}.</p></div></div>
    <div className="ranking-table" role="table" aria-label={`Classificação ${scopeLabel}, a partir do quarto colocado`}>
      <div className="ranking-table-head" role="row"><span role="columnheader">#</span><span role="columnheader">Jogador</span><span role="columnheader">Nível</span><span role="columnheader">Variação (semana)</span><span role="columnheader">XP da temporada</span></div>
      {rest.map(entry => <RankingRow key={entry.id} entry={entry} />)}
      {rest.length === 0 && <p className="ranking-empty">Ainda não há participantes após o Top 3.</p>}
    </div>
    {ranking.leaderboard?.length === 50 && ranking.totalParticipants > 50 && <p className="ranking-list-note">Exibindo os 50 primeiros de {ranking.totalParticipants.toLocaleString('pt-BR')} participantes.</p>}
  </section>;
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  const change = entry.weeklyChange;
  return <div className={`ranking-table-row${entry.isCurrentUser ? ' is-personal' : ''}`} role="row">
    <strong role="cell">#{entry.position}</strong>
    <span className="ranking-table-player" role="cell"><Avatar name={entry.name} imageUrl={entry.profileImageUrl} className="ranking-table-avatar" /><strong title={entry.name}>{entry.name}</strong>{entry.isCurrentUser && <em>Você</em>}</span>
    <span role="cell"><b className="ranking-level-badge">Nv. {entry.level}</b></span>
    <span className={`ranking-trend${change == null ? '' : change > 0 ? ' is-up' : change < 0 ? ' is-down' : ''}`} role="cell" title={change == null ? 'Variação semanal indisponível' : undefined}>{change == null || change === 0 ? '—' : change > 0 ? <><ArrowUp size={14} />{change}</> : <><ArrowDown size={14} />{Math.abs(change)}</>}</span>
    <strong className="ranking-table-xp" role="cell">{formatXp(entry.points)}</strong>
  </div>;
}
