import { useMemo } from 'react';
import { Check, Lock, RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { JourneyMap, type JourneyMapNode } from '@/components/shared/JourneyMap/JourneyMap';
import { getModuleArtwork } from '@/lib/staticArtwork';
import type { JourneyData } from '@/services/dashboard';
import { formatNumber, type HomeJourney, type HomeJourneyNode } from './homeJourneyModel';

interface HomeJourneyProps {
  journey: HomeJourney;
  summary: JourneyData['summary'] | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onOpenNode: (node: HomeJourneyNode) => void;
}

const artOf = (node: HomeJourneyNode) => getModuleArtwork({ title: node.title, artworkUrl: node.artworkUrl, thumbnail: null });

function ariaOf(node: HomeJourneyNode): string {
  const lessons = `${node.completedAulas} de ${node.totalAulas} aulas`;
  if (node.state === 'done') return `${node.title}, módulo completo, ${lessons}`;
  if (node.state === 'here') return `${node.title}, você está aqui, ${lessons}`;
  if (node.state === 'locked') return `${node.title}, bloqueado. ${node.previousTitle ? `Conclua ${node.previousTitle} para liberar.` : 'Ainda não liberado.'}`;
  return `${node.title}, disponível, ${lessons}`;
}

/** Card "Sua jornada": mapa; cada módulo liberado abre direto (sem painel extra). */
export function HomeJourney({ journey, summary, loading, error, onRetry, onOpenNode }: HomeJourneyProps) {
  const selected = journey.current ?? journey.nodes[0] ?? null;
  const open = (id: number) => {
    const node = journey.nodes.find((item) => item.id === id);
    if (node && node.state !== 'locked') onOpenNode(node);
  };
  const mapNodes = useMemo<JourneyMapNode[]>(() => journey.nodes.map((node) => ({
    id: node.id,
    title: node.title,
    caption: node.state === 'locked' ? 'Bloqueado' : `${node.completedAulas}/${node.totalAulas} aulas`,
    art: artOf(node),
    state: node.state,
    stage: node.stageIndex,
    ariaLabel: ariaOf(node),
  })), [journey.nodes]);
  return (
    <section className="hv-card hv-map" aria-labelledby="hv-map-title">
      <header className="hv-card-head">
        <div><p className="hv-eyebrow">A jornada</p><h2 id="hv-map-title" className="hv-display">Sua jornada</h2></div>
        <JourneyLegend journey={journey} />
      </header>
      <div className="hv-card-body hv-map-body">
        <JourneyBody journey={journey} mapNodes={mapNodes} selected={selected} onSelect={open} summary={summary} loading={loading} error={error} onRetry={onRetry} />
      </div>
    </section>
  );
}

function summaryLine(journey: HomeJourney, summary: JourneyData['summary'] | null): string {
  const modules = journey.nodes.length;
  const lessons = `${formatNumber(summary?.completedLessons ?? 0)} de ${formatNumber(summary?.totalLessons ?? 0)} aulas`;
  return `${lessons} · ${journey.completedModules} de ${modules} ${modules === 1 ? 'módulo completo' : 'módulos completos'}`;
}

interface JourneyBodyProps extends Omit<HomeJourneyProps, 'onOpenNode'> {
  mapNodes: JourneyMapNode[];
  selected: HomeJourneyNode | null;
  onSelect: (id: number) => void;
}

function JourneyBody({ journey, mapNodes, selected, onSelect, summary, loading, error, onRetry }: JourneyBodyProps) {
  const empty = journey.nodes.length === 0;
  if (loading && empty) return <div className="hv-map-state" aria-busy="true" aria-label="Carregando o mapa da jornada"><span className="hv-skeleton is-board" /></div>;
  if (error && empty) {
    return (
      <div className="hv-map-state" role="alert">
        <p>Não foi possível carregar o mapa da jornada.</p>
        <AppButton variant="chunky" tone="ghost" size="sm" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={onRetry}>Tentar novamente</AppButton>
      </div>
    );
  }
  if (empty) return <div className="hv-map-state"><p>Novos módulos aparecerão aqui.</p></div>;
  return (
    <>
      <p className="hv-map-summary">{summaryLine(journey, summary)}</p>
      <div className="hv-map-view">
        <JourneyMap nodes={mapNodes} stages={journey.stages} selectedId={selected?.id ?? null} onSelect={onSelect} interaction="open" label="Módulos da jornada. Escolha um para abrir." />
      </div>
    </>
  );
}

function JourneyLegend({ journey }: { journey: HomeJourney }) {
  if (journey.nodes.length === 0) return null;
  const states = new Set(journey.nodes.map((node) => node.state));
  return (
    <div className="hv-legend" aria-hidden="true">
      {states.has('done') && <span><i className="is-done"><Check size={12} strokeWidth={3.6} /></i>Concluído</span>}
      {states.has('here') && <span><i className="is-here" />Você está aqui</span>}
      {states.has('next') && <span><i className="is-next" />Disponível</span>}
      {states.has('locked') && <span><i className="is-locked"><Lock size={11} strokeWidth={3} /></i>Bloqueado</span>}
    </div>
  );
}
