import { useMemo, useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { useConteudos } from '@/hooks/useConteudos';
import { useDashboardJourney } from '@/hooks/useDashboard';
import { useSectionContext } from '@/contexts/SectionContext';
import { LearnContinue } from './LearnContinue';
import { LearnLevels, LearnTerritoryPanel } from './LearnTerritory';
import { LearnMap } from './LearnMap';
import { buildLearnJourney, type LearnJourney, type TerritoryIndex } from './learnMapModel';
import '@/styles/learn-map.css';

interface ModuloListProps { onSelectModulo: (moduloId: number) => void; }

const LEAD = 'Escolha o nível. Cada parada do mapa é um módulo, com capítulos e aulas dentro.';

function LearnHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="lv-head">
      <div>
        <h1 className="lv-display">Aprender</h1>
        <p className="lv-lead">{LEAD}</p>
      </div>
      {children}
    </header>
  );
}

function LearnSkeleton() {
  return (
    <div className="lv-skeleton-wrap" aria-busy="true" aria-label="Carregando os módulos">
      <span className="lv-skeleton is-next" />
      <div className="lv-columns">
        <div className="lv-skeleton-col">
          <span className="lv-skeleton is-title" />
          <span className="lv-skeleton is-row" />
          <span className="lv-skeleton is-row" />
          <span className="lv-skeleton is-row" />
        </div>
        <span className="lv-skeleton is-map" />
      </div>
    </div>
  );
}

type LoadStatus = 'loading' | 'error' | 'empty' | 'ready';

/**
 * Módulos (/conteudo/modulos) e jornada (mesmo hook/cache do Início) saem em
 * paralelo. O módulo atual vem do `currentModuleId` da jornada; só se ela
 * falhar o modelo usa a regra equivalente.
 */
function useLearnData() {
  const { modulos, loading, error, refetch } = useConteudos();
  const { journey, loading: journeyLoading, error: journeyError } = useDashboardJourney();
  const currentModuleId = journey ? journey.currentModuleId : undefined;
  const learn = useMemo(() => buildLearnJourney(modulos ?? [], currentModuleId), [modulos, currentModuleId]);
  const waitingJourney = journeyLoading && !journey && !journeyError;
  let status: LoadStatus = 'ready';
  if (error && !modulos) status = 'error';
  else if ((loading && !modulos) || waitingJourney) status = 'loading';
  else if (learn.modules.length === 0) status = 'empty';
  return { learn, status, refetch };
}

/** Território escolhido; por padrão, o do módulo atual. */
function useTerritorySelection(learn: LearnJourney) {
  const [picked, setPicked] = useState<TerritoryIndex | null>(null);
  const visible = learn.territories.filter((territory) => territory.modules.length > 0);
  const fallback = learn.current?.territory ?? visible[0]?.index ?? 0;
  const index = picked !== null && visible.some((territory) => territory.index === picked) ? picked : fallback;
  return { visible, index, territory: learn.territories[index], setPicked };
}

function LearnMessage({ status, onRetry }: { status: Exclude<LoadStatus, 'ready'>; onRetry: () => void }) {
  if (status === 'loading') return <LearnSkeleton />;
  if (status === 'error') {
    return (
      <div className="lv-state" role="alert">
        <h2 className="lv-display">Não foi possível carregar os módulos</h2>
        <p>Confira sua conexão e tente novamente.</p>
        <AppButton variant="chunky" tone="ghost" size="sm" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={onRetry}>Tentar novamente</AppButton>
      </div>
    );
  }
  return (
    <div className="lv-state">
      <BrandCharacter className="lv-state-art" expression="sleepy" />
      <h2 className="lv-display">Nenhum módulo por aqui ainda</h2>
      <p>Quando sua escola ou turma liberar módulos, eles aparecem neste mapa.</p>
    </div>
  );
}

/** Mapa de módulos do Aprender (canvas Aprender-tela V4). */
export function ModuloList({ onSelectModulo }: ModuloListProps) {
  const { learn, status, refetch } = useLearnData();
  const selection = useTerritorySelection(learn);
  const { setContentTarget } = useSectionContext();
  const openAula = (moduloId: number, aulaId: number) => setContentTarget({ moduloId, aulaId });

  if (status !== 'ready') {
    return <div className="learn-v"><LearnHeader /><LearnMessage status={status} onRetry={refetch} /></div>;
  }

  return (
    <div className="learn-v">
      <LearnHeader>
        {selection.visible.length > 1 && <LearnLevels territories={selection.visible} selected={selection.index} onSelect={selection.setPicked} />}
      </LearnHeader>
      <LearnContinue journey={learn} onOpenAula={openAula} onOpenModulo={onSelectModulo} />
      <div className="lv-columns">
        {selection.territory && <LearnTerritoryPanel territory={selection.territory} onOpenModulo={onSelectModulo} />}
        <LearnMap journey={learn} activeTerritory={selection.index} onOpenModulo={onSelectModulo} />
      </div>
    </div>
  );
}
