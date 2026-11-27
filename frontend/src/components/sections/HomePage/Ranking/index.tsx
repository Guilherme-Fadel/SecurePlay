import { useEffect, useMemo, useRef, useState } from 'react';
import { PageTransition } from '@/components/shared/PageTransition';
import { useSectionContext } from '@/contexts/SectionContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardRanking } from '@/hooks/useDashboard';
import { listarEmpresas, type EmpresaAdministravel } from '@/services/admin';
import type { RankingCategory, RankingData, RankingMode, RankingSeasonOption, RankingUnit } from '@/services/dashboard';
import {
  defaultScope, hostSpeech, isManagementRole, raceModel, scopeOptions, seasonBand, type RaceModel, type RankingScope, type SeasonBand,
} from './rankingModel';
import { boardRanking, categoryOf, unitOf } from './boardModel';
import { RankingBanner } from './RankingBanner';
import { RankingArea } from './RankingArea';
import '@/styles/ranking-ui.css';
// Depois de ranking-ui.css: as medidas do palco e do placar vencem o reset tipográfico escopado de .rank-v.
import '@/styles/hall-stage.css';
import '@/styles/hall-board.css';

function bannerLead(mode: RankingMode, management: boolean): string {
  if (management) return 'Acompanhe a classificação da turma. Professores e gestores não entram na disputa.';
  if (mode === 'season') return 'Veja como a temporada terminou.';
  if (mode === 'total') return 'Todo o XP que a turma já juntou, de todas as temporadas.';
  return 'Cada aula e desafio vale XP. Quem estuda com constância até o fim da temporada sobe no Hall da Fama.';
}

function weeklyHighlight(ranking: RankingData | null) {
  if (!ranking || ranking.mode !== 'current') return null;
  const items = ranking.weeklyHighlights ?? [];
  const item = items.find((highlight) => highlight.kind === 'xp') ?? items[0];
  return item ? { kind: item.kind, name: item.user.name, value: item.value } : null;
}

/**
 * Enquanto o ranking de outro filtro carrega, segue a última classificação (`stale`): o palco mostra
 * "Trocando o placar…" sobre ela até a nova chegar, em vez de sumir; o placar mostra silhuetas. Sem carregamento em
 * curso (erro, escolha de temporada), solta.
 */
function useKeptRanking(ranking: RankingData | null, hold: boolean): { ranking: RankingData | null; stale: boolean } {
  const last = useRef<RankingData | null>(null);
  if (ranking) last.current = ranking;
  else if (!hold) last.current = null;
  return { ranking: ranking ?? last.current, stale: !ranking && last.current !== null };
}

/** A fala do pet compara XP de alunos: fora da categoria XP e da unidade Alunos ele só fala do período. */
function speechFor(ranking: RankingData | null, band: SeasonBand, management: boolean) {
  const xpOfStudents = !!ranking && categoryOf(ranking) === 'xp' && unitOf(ranking) === 'students';
  const race: RaceModel | null = ranking && xpOfStudents ? raceModel(ranking) : null;
  return hostSpeech({ band, race, management, participants: ranking ? ranking.totalParticipants : null, highlight: weeklyHighlight(ranking) });
}

/** Escopo, empresa (platform_admin), unidade, categoria, período e temporada encerrada escolhidos na tela. */
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
  const [category, setCategory] = useState<RankingCategory>('xp');
  const [unit, setUnit] = useState<RankingUnit>('students');
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
    category,
    setCategory,
    unit,
    setUnit,
    seasonId,
    setPickedSeasonId,
    closedSeasons,
    selectedSeason: closedSeasons.find((option) => option.id === seasonId),
    hasCompleteClosedSeason: closedSeasons.some((option) => option.completeness === 'complete'),
    setSeasonOptions,
  };
}

export function Ranking() {
  const { user } = useCurrentUser();
  const { navigateToSection } = useSectionContext();
  const management = isManagementRole(user?.role);
  const filters = useRankingFilters();
  const { mode, seasonId, closedSeasons, setSeasonOptions } = filters;

  const { ranking: rawRanking, loading, refetch } = useDashboardRanking(
    filters.scope,
    filters.companyId,
    mode,
    { season: mode === 'season' && seasonId ? seasonId : undefined, category: filters.category, unit: filters.unit },
  );

  const board = useMemo(() => (rawRanking ? boardRanking(rawRanking) : null), [rawRanking]);
  const waitingForSeasonChoice = mode === 'season' && !seasonId;
  const { ranking, stale } = useKeptRanking(board, loading && !waitingForSeasonChoice);

  useEffect(() => {
    if (ranking?.availableSeasons) setSeasonOptions(ranking.availableSeasons);
  }, [ranking?.availableSeasons, setSeasonOptions]);

  const band = seasonBand(ranking?.season, mode, new Date(), filters.selectedSeason);
  const speech = speechFor(ranking, band, management);

  return (
    <PageTransition>
      <div className="rank-v">
        <RankingBanner band={band} lead={bannerLead(mode, management)} speech={speech} />
        <RankingArea
          filters={{
            scopes: filters.scopes,
            scope: filters.scope,
            onScopeChange: filters.setScope,
            companyBlocked: !!ranking && !ranking.companyAvailable,
            unit: filters.unit,
            onUnitChange: filters.setUnit,
            category: filters.category,
            onCategoryChange: filters.setCategory,
            mode,
            onModeChange: filters.setMode,
            closedSeasons,
            selectedSeasonId: seasonId,
            onSeasonChange: filters.setPickedSeasonId,
            companies: filters.companies,
            companyId: filters.companyId,
            onCompanyChange: filters.setCompanyId,
          }}
          ranking={ranking}
          stale={stale}
          loading={loading}
          onRetry={refetch}
          waitingForSeason={waitingForSeasonChoice}
          closedSeasonCount={closedSeasons.length}
          hasCompleteClosedSeason={filters.hasCompleteClosedSeason}
          management={management}
          seasonName={band.name}
          onContinue={() => navigateToSection('conteudos')}
        />
      </div>
    </PageTransition>
  );
}
