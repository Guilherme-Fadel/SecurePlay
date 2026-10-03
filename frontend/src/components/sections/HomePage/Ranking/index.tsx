import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Building2, CalendarDays, Crown, Flame, Globe2, Medal, RefreshCw, Shield, Zap } from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { Avatar } from '@/components/ui/visuals/Avatar';
import { useDashboardRanking } from '@/hooks/useDashboard';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listarEmpresas, type EmpresaAdministravel } from '@/services/admin';
import type { RankingData, RankingEntry, RankingMode, RankingSeasonOption } from '@/services/dashboard';
import galleryEmblem from '@/assets/static/mission-room/missions-room-emblem.png';
import hallArtwork from '@/assets/static/ranking/ranking-gallery-hall-v1.webp';
import firstBanner from '@/assets/static/ranking/ranking-banner-first-v1.svg';
import secondBanner from '@/assets/static/ranking/ranking-banner-second-v1.svg';
import thirdBanner from '@/assets/static/ranking/ranking-banner-third-v1.svg';
import '@/styles/ranking-ui.css';

type RankingScope = 'global' | 'company';
type RankingViewMode = RankingMode;
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
  const { user } = useCurrentUser();
  const isPlatformAdmin = user?.role === 'platform_admin';
  const [scope, setScope] = useState<RankingScope>(features.globalRanking ? 'global' : 'company');
  const [companies, setCompanies] = useState<EmpresaAdministravel[]>([]);
  const [companyId, setCompanyId] = useState<number>();
  useEffect(() => { if (isPlatformAdmin) void listarEmpresas().then((items) => { setCompanies(items); setCompanyId((current) => current ?? items[0]?.id); }).catch(() => setCompanies([])); }, [isPlatformAdmin]);
  const effectiveScope = features.globalRanking ? scope : 'company';
  return <RankingContent key={`${effectiveScope}-${companyId ?? 'none'}`} scope={effectiveScope} companyId={isPlatformAdmin ? companyId : undefined} companies={isPlatformAdmin ? companies : []} onCompanyChange={setCompanyId} onScopeChange={setScope} />;
}

function RankingContent({ scope, companyId, companies, onCompanyChange, onScopeChange }: { scope: RankingScope; companyId?: number; companies: EmpresaAdministravel[]; onCompanyChange: (id: number) => void; onScopeChange: (scope: RankingScope) => void }) {
  const features = useCompanyFeatures();
  const { user } = useCurrentUser();
  const isManagement = user?.role === 'admin' || user?.role === 'platform_admin';
  const [viewMode, setViewMode] = useState<RankingViewMode>('current');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [seasonOptions, setSeasonOptions] = useState<RankingSeasonOption[]>([]);
  const { ranking, loading, error, refetch } = useDashboardRanking(scope, companyId, viewMode, viewMode === 'season' ? selectedSeasonId : undefined);
  const scopeLabel = ranking?.scope === 'company' ? 'Minha instituição' : 'Global';
  const season = ranking?.season;
  const closedSeasons = seasonOptions.filter(option => option.status === 'closed');
  const selectedSeason = closedSeasons.find(option => option.id === selectedSeasonId);

  useEffect(() => {
    if (ranking?.availableSeasons) setSeasonOptions(ranking.availableSeasons);
  }, [ranking?.availableSeasons]);

  useEffect(() => {
    const firstCompleteClosedSeasonId = seasonOptions.find(option => option.status === 'closed' && option.completeness === 'complete')?.id;
    if (viewMode === 'season' && !selectedSeasonId && firstCompleteClosedSeasonId) setSelectedSeasonId(firstCompleteClosedSeasonId);
  }, [viewMode, selectedSeasonId, seasonOptions]);

  const changeViewMode = (mode: RankingViewMode) => {
    if (mode === 'season' && !selectedSeasonId) {
      setSelectedSeasonId(closedSeasons.find(option => option.completeness === 'complete')?.id ?? '');
    }
    setViewMode(mode);
  };
  const waitingForSeasonChoice = viewMode === 'season' && !selectedSeasonId;
  const hasCompleteClosedSeason = closedSeasons.some(option => option.completeness === 'complete');
  const xpLabel = viewMode === 'total' ? 'XP total' : 'XP da temporada';

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
            <label className="ranking-mode-select"><span className="sr-only">Classificar por</span><AppSelect aria-label="Classificar ranking por" value={viewMode} onChange={event => changeViewMode(event.target.value as RankingViewMode)}>
              <option value="current">Temporada atual</option>
              <option value="season" disabled={!ranking && (loading || !!error) && seasonOptions.length === 0}>Temporadas encerradas</option>
              <option value="total">Total de XP</option>
            </AppSelect></label>
            {viewMode === 'season' && closedSeasons.length > 0 && <label className="ranking-mode-select ranking-season-select"><span className="sr-only">Temporada encerrada</span><AppSelect aria-label="Escolher temporada encerrada" value={selectedSeasonId} onChange={event => setSelectedSeasonId(event.target.value)}>
              <option value="">Escolha uma temporada</option>
              {closedSeasons.map(option => <option key={option.id} value={option.id}>{option.name} · {option.completeness === 'complete' ? 'completa' : option.completeness === 'partial' ? 'parcial' : 'sem histórico completo'}</option>)}
            </AppSelect></label>}
            {scope === 'company' && companies.length > 0 && <label className="ranking-company-select">Empresa<AppSelect value={companyId ?? ''} onChange={(event) => onCompanyChange(Number(event.target.value))}>{companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}</AppSelect></label>}
            {viewMode === 'current' && <div className="ranking-season-pill" title={season ? undefined : 'Nenhuma temporada configurada'}><CalendarDays size={17} />{seasonLabel(season)}</div>}
            {viewMode === 'season' && selectedSeason && <div className="ranking-season-pill"><CalendarDays size={17} />{selectedSeason.name}{selectedSeason.completeness === 'complete' ? ' · completa' : selectedSeason.completeness === 'partial' ? ' · parcial' : ' · sem histórico completo'}</div>}
            {viewMode === 'total' && <div className="ranking-season-pill"><Medal size={17} />Pontuação acumulada</div>}
            <button className="ranking-refresh" type="button" onClick={refetch} disabled={loading} aria-label="Atualizar ranking" title="Atualizar ranking"><RefreshCw size={17} /></button>
          </div>
        </header>
        {waitingForSeasonChoice ? <div className="ranking-history-empty" role="status"><h2>Nenhum histórico completo disponível</h2><p>{closedSeasons.length === 0 ? 'Ainda não há uma temporada encerrada para consultar.' : 'Escolha uma temporada encerrada para verificar os dados disponíveis. Os períodos sem histórico completo serão identificados e não exibidos como resultados finais.'}</p></div> :
        loading && !ranking ? <div className="ranking-status" role="status">Carregando a Galeria de Honra…</div> :
          error || !ranking ? <div className="ranking-status" role="alert"><h2>Não foi possível carregar o ranking</h2><p>Tente novamente para atualizar a classificação.</p><AppButton onClick={refetch}>Tentar novamente</AppButton></div> :
          viewMode === 'season' && ranking.dataCompleteness === 'unavailable' ? <div className="ranking-history-empty" role="status"><h2>Histórico não disponível</h2><p>Não há dados completos para montar a classificação final desta temporada.</p></div> :
          <div className="ranking-content">
            {!ranking.companyAvailable && <p className="ranking-scope-hint">Você ainda não faz parte de uma instituição. Exibindo o ranking disponível.</p>}
            <RankingHero top={ranking.top} scopeLabel={scopeLabel} xpLabel={xpLabel} xpQualifier={viewMode === 'total' ? 'acumulado' : 'na temporada'} />
            {viewMode !== 'current' && ranking.dataCompleteness === 'partial' && !(viewMode === 'season' && !hasCompleteClosedSeason && closedSeasons.length > 0) && <p className="ranking-history-notice" role="status">Este histórico é parcial e não representa o resultado completo deste período.</p>}
            {viewMode === 'season' && !hasCompleteClosedSeason && closedSeasons.length > 0 && <p className="ranking-history-notice" role="status">Ainda não há temporada encerrada com histórico completo. Os períodos incompletos estão identificados no seletor.</p>}
            {viewMode !== 'current' && ranking.dataCompleteness === 'unavailable' && <p className="ranking-history-notice" role="status">Os dados deste ranking não estão disponíveis.</p>}
            <div className={`ranking-content-grid${isManagement ? ' is-management' : ''}${viewMode !== 'current' ? ' is-historical' : ''}`}>
              {viewMode === 'current' && !isManagement && ranking.currentUser && <JourneyCard ranking={ranking} />}
              {viewMode === 'current' && <WeeklyHighlights ranking={ranking} />}
              <RankingSection ranking={ranking} scopeLabel={scopeLabel} xpLabel={xpLabel} />
            </div>
          </div>}
      </div>
    </PageTransition>
  );
}

function RankingHero({ top, scopeLabel, xpLabel, xpQualifier }: { top: RankingEntry[]; scopeLabel: string; xpLabel: string; xpQualifier: string }) {
  return <section className="ranking-hero" aria-label={`Galeria de Honra — ${scopeLabel}, ${xpLabel}`}>
    <img className="ranking-hero-art" src={hallArtwork} alt="" />
    <div className="ranking-hero-light" aria-hidden="true" />
    <div className="ranking-podium" role="list" aria-label="Três primeiros colocados">
      {top.slice(0, 3).map((entry, index) => <LeaderBanner key={entry.id} entry={entry} place={index + 1} xpQualifier={xpQualifier} />)}
    </div>
    {top.length === 0 && <p className="ranking-hero-empty">A galeria está esperando seus primeiros participantes.</p>}
  </section>;
}

function LeaderBanner({ entry, place, xpQualifier }: { entry: RankingEntry; place: number; xpQualifier: string }) {
  return <div className={`ranking-leader ranking-leader-${place}`} role="listitem" aria-label={`${entry.position}º lugar: ${entry.name}, ${formatXp(entry.points)} ${xpQualifier}`}>
    <img className="ranking-leader-art" src={bannerByPosition[place - 1]} alt="" />
    {place === 1 && <Crown className="ranking-leader-crown" size={32} aria-hidden="true" />}
    <span className="ranking-leader-medal">{entry.position}</span>
    <Avatar name={entry.name} imageUrl={entry.profileImageUrl} className="ranking-leader-avatar" />
    <span className="ranking-leader-details"><strong title={entry.name}>{entry.name}</strong><b>{formatXp(entry.points)}</b><small>{xpQualifier}</small></span>
  </div>;
}

function JourneyCard({ ranking }: { ranking: RankingData }) {
  const user = ranking.currentUser;
  if (!user) return null;
  const gap = ranking.summary.pointsToNextPosition;
  const progress = gap && gap > 0 ? Math.min(100, Math.round(user.points / (user.points + gap) * 100)) : user.points > 0 ? 100 : 0;
  const change = ranking.weeklyPositionChange;
  return <section className="ranking-card ranking-journey" aria-labelledby="ranking-journey-title">
    <div className="ranking-card-heading"><span className="ranking-card-icon"><BookOpen size={25} /></span><div><h2 id="ranking-journey-title">Sua Jornada</h2><p>Continue aprendendo. Você está mais perto da próxima posição!</p></div></div>
    <div className="ranking-journey-panel">
      <div className="ranking-journey-identity"><div><small>Sua posição</small><strong className="ranking-journey-position">#{user.position}</strong></div><Avatar name={user.name} imageUrl={user.profileImageUrl} className="ranking-journey-avatar" /><div className="ranking-journey-name"><strong title={user.name}>{user.name}</strong><span><Shield size={13} /> Nv. {user.level}</span></div></div>
      <div className="ranking-journey-progress">
        <div className="ranking-journey-movement">{change == null ? <span className="is-neutral">Variação semanal indisponível</span> : change > 0 ? <span className="is-up"><ArrowUp size={17} /> {change} {change === 1 ? 'posição' : 'posições'} esta semana</span> : change < 0 ? <span className="is-down"><ArrowDown size={17} /> {Math.abs(change)} {change === -1 ? 'posição' : 'posições'} esta semana</span> : <span className="is-neutral">Posição estável esta semana</span>}</div>
        <div className="ranking-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso até a próxima posição"><span style={{ width: `${progress}%` }} /></div>
        <small>{gap && gap > 0 ? `${gap.toLocaleString('pt-BR')} XP para alcançar #${user.position - 1}` : user.points === 0 ? 'A temporada está começando' : 'Você está na liderança desta classificação'}</small>
      </div>
      <strong className="ranking-journey-xp"><Medal size={19} /><span><b>{formatXp(user.points)}</b><small>na temporada</small></span></strong>
    </div>
  </section>;
}

const highlightIcons = { streak: Flame, xp: Zap, challenges: Shield };
function WeeklyHighlights({ ranking }: { ranking: RankingData }) {
  const highlights = ranking.weeklyHighlights ?? [];
  return <section className="ranking-card ranking-highlights" aria-labelledby="ranking-highlights-title">
    <div className="ranking-card-heading"><div><h2 id="ranking-highlights-title">Destaques da semana</h2><p>Realizações que inspiram nossa comunidade.</p></div></div>
    <div className="ranking-highlights-list">
      {highlights.length === 0 ? <p className="ranking-highlights-empty">{ranking.weeklyDataAvailable ? 'Nenhuma atividade nesta semana.' : 'Dados semanais indisponíveis.'}</p> : highlights.map(item => {
        const Icon = highlightIcons[item.kind];
        return <div className="ranking-highlight" key={item.kind}><Icon size={18} className={`ranking-highlight-icon is-${item.kind}`} /><span className="ranking-highlight-label">{item.label}</span><Avatar name={item.user.name} imageUrl={item.user.profileImageUrl} className="ranking-highlight-avatar" /><strong title={item.user.name}>{item.user.name}</strong><b>{item.value.toLocaleString('pt-BR')} {item.unit}</b></div>;
      })}
    </div>
  </section>;
}

function RankingSection({ ranking, scopeLabel, xpLabel }: { ranking: RankingData; scopeLabel: string; xpLabel: string }) {
  const rest = (ranking.leaderboard ?? ranking.top).slice(3);
  const showWeeklyChange = ranking.mode === 'current';
  const description = ranking.mode === 'total'
    ? 'Classificação pelo XP acumulado; o nível mostra a faixa alcançada.'
    : ranking.mode === 'season'
      ? ranking.dataCompleteness === 'complete'
        ? 'Resultado final desta temporada, ordenado pelo XP conquistado no período.'
        : 'Dados parciais desta temporada, ordenados pelo XP registrado no período.'
      : `Veja quem está subindo no ranking ${scopeLabel === 'Global' ? 'global' : 'da sua instituição'}.`;
  return <section className="ranking-card ranking-classification" aria-labelledby="ranking-classification-title">
    <div className="ranking-card-heading"><div><h2 id="ranking-classification-title">Classificação</h2><p>{description}</p></div></div>
    {rest.length > 0 ? <div className={`ranking-table${showWeeklyChange ? '' : ' is-history'}`} role="table" aria-label={`Classificação ${scopeLabel}, ${xpLabel}, a partir do quarto colocado`}>
      <div className="ranking-table-head" role="row"><span role="columnheader">#</span><span role="columnheader">Jogador</span><span role="columnheader">Nível</span>{showWeeklyChange && <span role="columnheader">Variação (semana)</span>}<span role="columnheader">{xpLabel}</span></div>
      {rest.map(entry => <RankingRow key={entry.id} entry={entry} showWeeklyChange={showWeeklyChange} />)}
    </div> : <p className="ranking-empty">{ranking.totalParticipants === 0 ? 'Ainda não há participantes nesta classificação.' : 'Todos os participantes desta classificação estão no pódio.'}</p>}
    {ranking.leaderboard?.length === 50 && ranking.totalParticipants > 50 && <p className="ranking-list-note">Exibindo os 50 primeiros de {ranking.totalParticipants.toLocaleString('pt-BR')} participantes.</p>}
  </section>;
}

function RankingRow({ entry, showWeeklyChange }: { entry: RankingEntry; showWeeklyChange: boolean }) {
  const change = entry.weeklyChange;
  return <div className={`ranking-table-row${entry.isCurrentUser ? ' is-personal' : ''}`} role="row">
    <strong role="cell">#{entry.position}</strong>
    <span className="ranking-table-player" role="cell"><Avatar name={entry.name} imageUrl={entry.profileImageUrl} className="ranking-table-avatar" /><strong title={entry.name}>{entry.name}</strong>{entry.isCurrentUser && <em>Você</em>}</span>
    <span role="cell"><b className="ranking-level-badge">Nv. {entry.level}</b></span>
    {showWeeklyChange && <span className={`ranking-trend${change == null ? '' : change > 0 ? ' is-up' : change < 0 ? ' is-down' : ''}`} role="cell" title={change == null ? 'Variação semanal indisponível' : undefined}>{change == null || change === 0 ? '—' : change > 0 ? <><ArrowUp size={14} />{change}</> : <><ArrowDown size={14} />{Math.abs(change)}</>}</span>}
    <strong className="ranking-table-xp" role="cell">{formatXp(entry.points)}</strong>
  </div>;
}
