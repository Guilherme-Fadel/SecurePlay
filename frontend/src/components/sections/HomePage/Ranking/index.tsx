import { useEffect, useMemo, useState } from 'react';
import { ContentLoading } from '@/components/shared/ContentLoading';
import { PageTransition } from '@/components/shared/PageTransition';
import { useSectionContext } from '@/contexts/SectionContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardRanking } from '@/hooks/useDashboard';
import { listarEmpresas, type EmpresaAdministravel } from '@/services/admin';
import type { RankingData, RankingMode, RankingSeasonOption } from '@/services/dashboard';
import {
  boardModel, defaultScope, formatNumber, hostSpeech, isManagementRole, leaderboardOf, podiumSlots,
  raceModel, scopeOptions, seasonBand, type RaceModel, type RankingScope,
} from './rankingModel';
import { withViewerPhoto } from './rankingAvatarTone';
import { RankingBanner } from './RankingBanner';
import { RankingBoard } from './RankingBoard';
import { RankingControls } from './RankingControls';
import { RankingPodium } from './RankingPodium';
import { RankingRace } from './RankingRace';
import { RankingHighlights, RankingManagement, RankingNotParticipating } from './RankingSide';
import { RankingState } from './RankingStates';
import '@/styles/ranking-ui.css';

function bannerLead(mode: RankingMode, management: boolean): string {
  if (management) return 'Acompanhe a classificação da turma. Professores e gestores não entram na disputa.';
  if (mode === 'season') return 'Veja como a temporada terminou.';
  if (mode === 'total') return 'Todo o XP que a turma já juntou, de todas as temporadas.';
  return 'Cada aula e desafio vale XP. Quem estuda com constância até o fim da temporada sobe para o pódio.';
}

function weeklyHighlight(ranking: RankingData | null) {
  if (!ranking || ranking.mode !== 'current') return null;
  const items = ranking.weeklyHighlights ?? [];
  const item = items.find((highlight) => highlight.kind === 'xp') ?? items[0];
  return item ? { kind: item.kind, name: item.user.name, value: item.value } : null;
}

/** Escopo, empresa (platform_admin), período e temporada encerrada escolhidos na tela. */
function useRankingFilters() {
  const features = useCompanyFeatures();
  const { user } = useCurrentUser();
  const isPlatformAdmin = user?.role === 'platform_admin';
  const scopes = scopeOptions(features.globalRanking, !!user?.trial_ends_at);
  // platform_admin começa no Global (como antes): o escopo da instituição depende da empresa
  // escolhida no seletor, que só existe depois de listarEmpresas.
  const [scope, setScope] = useState<RankingScope>(() => defaultScope(scopes, !isPlatformAdmin && !!user?.empresa_id));
  const [companies, setCompanies] = useState<EmpresaAdministravel[]>([]);
  const [companyId, setCompanyId] = useState<number>();
  const [mode, setMode] = useState<RankingMode>('current');
  const [pickedSeasonId, setPickedSeasonId] = useState('');
  const [seasonOptions, setSeasonOptions] = useState<RankingSeasonOption[]>([]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    let active = true;
    listarEmpresas()
      .then((items) => { if (!active) return; setCompanies(items); setCompanyId((current) => current ?? items[0]?.id); })
      .catch(() => { if (active) setCompanies([]); });
    return () => { active = false; };
  }, [isPlatformAdmin]);

  // Temporadas encerradas: a escolhida ou, sem escolha, a primeira com histórico completo.
  const closedSeasons = seasonOptions.filter((option) => option.status === 'closed');
  const seasonId = pickedSeasonId || (closedSeasons.find((option) => option.completeness === 'complete')?.id ?? '');
  const activeScope: RankingScope = scopes.includes(scope) ? scope : 'company';
  return {
    scopes,
    scope: activeScope,
    setScope,
    companies: isPlatformAdmin ? companies : [],
    companyId: isPlatformAdmin ? companyId : undefined,
    setCompanyId,
    mode,
    setMode,
    seasonId,
    setPickedSeasonId,
    closedSeasons,
    selectedSeason: closedSeasons.find((option) => option.id === seasonId),
    hasCompleteClosedSeason: closedSeasons.some((option) => option.completeness === 'complete'),
    setSeasonOptions,
  };
}

export function Ranking() {
  const features = useCompanyFeatures();
  const { user } = useCurrentUser();
  const { navigateToSection } = useSectionContext();
  const management = isManagementRole(user?.role);
  const filters = useRankingFilters();
  const { mode, seasonId, closedSeasons, setSeasonOptions } = filters;

  const { ranking: rawRanking, loading, refetch } = useDashboardRanking(
    filters.scope,
    filters.companyId,
    mode,
    mode === 'season' && seasonId ? seasonId : undefined,
  );

  // Sua foto do perfil quando o ranking envia a sua linha sem foto (só exibição).
  const viewerPhoto = user?.profile_image_url ?? null;
  const ranking = useMemo(() => (rawRanking ? withViewerPhoto(rawRanking, viewerPhoto) : null), [rawRanking, viewerPhoto]);

  useEffect(() => {
    if (ranking?.availableSeasons) setSeasonOptions(ranking.availableSeasons);
  }, [ranking?.availableSeasons, setSeasonOptions]);

  const waitingForSeasonChoice = mode === 'season' && !seasonId;
  const band = seasonBand(ranking?.season, mode, new Date(), filters.selectedSeason);
  const race: RaceModel | null = ranking ? raceModel(ranking) : null;
  const speech = hostSpeech({
    band,
    race,
    management,
    participants: ranking ? ranking.totalParticipants : null,
    highlight: weeklyHighlight(ranking),
  });

  return (
    <PageTransition>
      <div className="rank-v">
        <RankingBanner band={band} lead={bannerLead(mode, management)} speech={speech} />
        <RankingControls
          scopes={filters.scopes}
          scope={filters.scope}
          onScopeChange={filters.setScope}
          companyBlocked={!!ranking && !ranking.companyAvailable}
          mode={mode}
          onModeChange={filters.setMode}
          closedSeasons={closedSeasons}
          selectedSeasonId={seasonId}
          onSeasonChange={filters.setPickedSeasonId}
          companies={filters.companies}
          companyId={filters.companyId}
          onCompanyChange={filters.setCompanyId}
          refreshing={loading}
          onRefresh={refetch}
        />
        <RankingArea
          ranking={ranking}
          loading={loading}
          onRetry={refetch}
          waitingForSeason={waitingForSeasonChoice}
          closedSeasonCount={closedSeasons.length}
          race={race}
          management={management}
          seasonName={band.name}
          hasCompleteClosedSeason={filters.hasCompleteClosedSeason}
          showPractice={features.games.length > 0}
          onContinue={() => navigateToSection('conteudos')}
          onPractice={() => navigateToSection('desafios')}
        />
      </div>
    </PageTransition>
  );
}

interface RankingAreaProps extends Omit<RankingBodyProps, 'ranking'> {
  ranking: RankingData | null;
  loading: boolean;
  onRetry: () => void;
  waitingForSeason: boolean;
}

/** Estados exclusivos: escolha de temporada, carregando, erro, histórico indisponível ou o ranking. */
function RankingArea({ ranking, loading, onRetry, waitingForSeason, ...rest }: RankingAreaProps) {
  if (waitingForSeason) {
    return (
      <RankingState title="Nenhum histórico completo disponível">
        {rest.closedSeasonCount === 0
          ? 'Ainda não há uma temporada encerrada para consultar.'
          : 'Escolha uma temporada encerrada para ver os dados disponíveis. Períodos sem histórico completo são identificados e não aparecem como resultado final.'}
      </RankingState>
    );
  }
  if (!ranking) {
    if (loading) return <ContentLoading variant="ranking" />;
    return <RankingState title="Não foi possível carregar o ranking" kind="alert" onRetry={onRetry}>Tente novamente para atualizar a classificação.</RankingState>;
  }
  if (ranking.mode === 'season' && ranking.dataCompleteness === 'unavailable') {
    return <RankingState title="Histórico não disponível">Não há dados completos para montar a classificação final desta temporada.</RankingState>;
  }
  return <RankingBody ranking={ranking} {...rest} />;
}

interface RankingBodyProps {
  ranking: RankingData;
  race: RaceModel | null;
  management: boolean;
  seasonName: string;
  hasCompleteClosedSeason: boolean;
  closedSeasonCount: number;
  showPractice: boolean;
  onContinue: () => void;
  onPractice: () => void;
}

function RankingNotices({ ranking, noCompleteSeason }: { ranking: RankingData; noCompleteSeason: boolean }) {
  const historical = ranking.mode !== 'current';
  return (
    <>
      {!ranking.companyAvailable && <p className="rk-notice">Você ainda não faz parte de uma instituição. Exibindo o ranking disponível.</p>}
      {historical && ranking.dataCompleteness === 'partial' && !noCompleteSeason && <p className="rk-notice" role="status">Este histórico é parcial e não representa o resultado completo deste período.</p>}
      {noCompleteSeason && <p className="rk-notice" role="status">Ainda não há temporada encerrada com histórico completo. Os períodos incompletos estão identificados no seletor.</p>}
      {ranking.mode === 'total' && ranking.dataCompleteness === 'unavailable' && <p className="rk-notice" role="status">Os dados deste ranking não estão disponíveis.</p>}
    </>
  );
}

type SideProps = Pick<RankingBodyProps, 'ranking' | 'race' | 'management' | 'seasonName' | 'showPractice' | 'onContinue' | 'onPractice'>;

/** Gestão vê sem participar; aluno participante vê a corrida; aluno fora desta classificação, um aviso. */
function RankingSideCard({ ranking, race, management, seasonName, showPractice, onContinue, onPractice }: SideProps) {
  if (management) return <RankingManagement participants={ranking.totalParticipants} companyName={ranking.scope === 'global' ? null : ranking.company?.name ?? null} />;
  if (!race) return <RankingNotParticipating />;
  return <RankingRace race={race} seasonName={seasonName} weeklyChange={ranking.weeklyPositionChange ?? null} showActions={ranking.mode !== 'season'} showPractice={showPractice} onContinue={onContinue} onPractice={onPractice} />;
}

function RankingBoardBlock({ ranking, subtitle, listLength }: { ranking: RankingData; subtitle: string; listLength: number }) {
  return (
    <RankingBoard
      board={boardModel(ranking)}
      subtitle={subtitle}
      showTrend={ranking.mode === 'current'}
      weeklyAvailable={ranking.weeklyDataAvailable ?? false}
      showCompany={ranking.scope === 'global'}
      participants={ranking.totalParticipants}
      listLength={listLength}
    />
  );
}

function RankingBody(props: RankingBodyProps) {
  const { ranking, management, hasCompleteClosedSeason, closedSeasonCount } = props;
  const list = leaderboardOf(ranking);
  const isGlobal = ranking.scope === 'global';
  const audience = isGlobal ? 'Todas as escolas' : ranking.company?.name ?? 'Minha instituição';
  const participants = `${formatNumber(ranking.totalParticipants)} ${ranking.totalParticipants === 1 ? 'participante' : 'participantes'}`;
  const noCompleteSeason = ranking.mode === 'season' && !hasCompleteClosedSeason && closedSeasonCount > 0;
  const emptyText = management ? 'Nenhum aluno pontuou nesta classificação ainda.' : 'Ninguém pontuou nesta classificação ainda. A primeira aula já coloca você no ranking.';

  return (
    <>
      <RankingNotices ranking={ranking} noCompleteSeason={noCompleteSeason} />
      {/* Ordem do DOM = ordem de leitura: pódio, sua corrida, classificação (no desktop a grade posiciona). */}
      <div className="rk-grid">
        {list.length === 0
          ? <div className="rk-empty-slot"><RankingState title="Ainda não há participantes">{emptyText}</RankingState></div>
          : <RankingPodium slots={podiumSlots(ranking)} metric={ranking.mode === 'total' ? 'XP total' : 'XP da temporada'} showCompany={isGlobal} />}
        <div className="rk-side">
          <RankingSideCard {...props} />
          {ranking.mode === 'current' && <RankingHighlights ranking={ranking} />}
        </div>
        {list.length > 0 && <RankingBoardBlock ranking={ranking} subtitle={`${audience} · ${participants}`} listLength={list.length} />}
      </div>
    </>
  );
}
