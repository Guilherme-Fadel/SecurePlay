import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenCheck, Check, ChevronRight, Lock, Map, RotateCcw } from 'lucide-react';
import type { JourneyData, JourneyNodeData } from '@/services/dashboard';
import { ProgressiveImage } from '@/components/ui/visuals/ProgressiveImage';
import journeyWide from '@/assets/dashboard/journey-landscape-panorama-v2.png';
import journeyCompact from '@/assets/dashboard/journey-landscape-compact-v1.jpg';
import { getModuleArtwork } from '@/lib/staticArtwork';
import {
  buildJourneyPath,
  getJourneySlots,
  getJourneyWindow,
  visibleNodeCount,
} from './journeyLayout';

interface JourneyPreviewProps {
  journey: JourneyData | null;
  loading: boolean;
  error: string | null;
  onOpenNode: (node: JourneyNodeData) => void;
  onOpenAll: () => void;
  onRetry: () => void;
}

export function JourneyPreview({
  journey,
  loading,
  error,
  onOpenNode,
  onOpenAll,
  onRetry,
}: JourneyPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [nodeCount, setNodeCount] = useState(6);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => setNodeCount(visibleNodeCount(host.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const allNodes = useMemo(
    () =>
      (journey?.stages ?? []).flatMap((stage) =>
        stage.nodes.map((node) => ({ ...node, stageTitle: stage.title })),
      ),
    [journey],
  );
  const visibleNodes = getJourneyWindow(
    allNodes,
    journey?.currentModuleId ?? null,
    nodeCount,
  );
  const slots = getJourneySlots(visibleNodes.length);
  const activeSlots = slots.slice(0, visibleNodes.length);
  const path = buildJourneyPath(activeSlots);
  const currentIndex = Math.max(
    0,
    visibleNodes.findIndex((node) => node.id === journey?.currentModuleId),
  );
  const current = allNodes.find((node) => node.id === journey?.currentModuleId);
  const stageTitle = current?.stageTitle ?? journey?.stages[0]?.title ?? 'Sua jornada';
  const pathProgress =
    visibleNodes.length <= 1
      ? (visibleNodes[0]?.progress ?? 0)
      : Math.min(
          100,
          ((currentIndex + (current?.progress ?? 0) / 100) /
            (visibleNodes.length - 1)) *
            100,
        );

  return (
    <section className="hall-panel hall-journey-section" aria-labelledby="journey-title">
      <header className="hall-section-heading">
        <div>
          <h2 id="journey-title">Sua jornada</h2>
        </div>
        <button type="button" onClick={onOpenAll} className="hall-link-button">
          Ver todas as missões <ChevronRight size={16} />
        </button>
        <div className="hall-journey-legend" aria-label="Legenda do mapa">
          <span><i className="is-complete" /> Concluído</span>
          <span><i className="is-current" /> Atual</span>
          <span><i /> Disponível</span>
          <span><Lock size={10} /> Bloqueado</span>
        </div>
      </header>
      <div className="hall-journey" ref={hostRef}>
        <picture className="hall-journey-picture" aria-hidden="true">
          <source media="(max-width: 639px)" srcSet={journeyCompact} />
          <img src={journeyWide} alt="" />
        </picture>
        <div className="hall-journey-shade" aria-hidden="true" />
        <div className="hall-stage-label">
          <Map size={16} aria-hidden="true" />
          <span>{stageTitle}</span>
        </div>

        {loading && <div className="hall-journey-state">Preparando seu mapa...</div>}
        {!loading && error && (
          <div className="hall-journey-state">
            <p>Não foi possível carregar a jornada.</p>
            <button type="button" onClick={onRetry}>
              <RotateCcw size={15} /> Tentar novamente
            </button>
          </div>
        )}
        {!loading && !error && visibleNodes.length === 0 && (
          <div className="hall-journey-state">
            <BookOpenCheck size={28} />
            <p>Novas missões aparecerão aqui.</p>
          </div>
        )}

        {!loading && !error && visibleNodes.length > 0 && (
          <>
            <svg
              className="hall-journey-path"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path className="hall-path-shadow" d={path} pathLength="100" />
              <path className="hall-path-base" d={path} pathLength="100" />
              <path
                className="hall-path-progress"
                d={path}
                pathLength="100"
                style={{ strokeDasharray: `${pathProgress} 100` }}
              />
            </svg>
            <ol className="hall-journey-nodes" aria-label="Módulos visíveis da jornada">
              {visibleNodes.map((node, index) => {
                const slot = activeSlots[index];
                const isCurrent = node.id === journey?.currentModuleId;
                const isComplete = node.progress === 100;
                const isLocked = node.availability === 'locked';
                return (
                  <li
                    key={node.id}
                    style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                    className={isLocked ? 'is-locked' : isCurrent ? 'is-current' : isComplete ? 'is-complete' : ''}
                  >
                    <button
                      type="button"
                      className="hall-journey-node"
                      onClick={isLocked ? undefined : () => onOpenNode(node)}
                      disabled={isLocked}
                      aria-disabled={isLocked}
                      aria-current={isCurrent ? 'step' : undefined}
                      aria-label={isLocked ? `${node.title}, bloqueado. Conclua o módulo anterior para desbloquear.` : `${node.title}, ${node.completedAulas} de ${node.totalAulas} aulas concluídas`}
                    >
                      <span className="hall-node-orbit" aria-hidden="true">
                        <i style={{ '--node-progress': `${node.progress * 3.6}deg` } as React.CSSProperties} />
                      </span>
                      <span className="hall-node-core">
                        {isComplete ? (
                          <Check size={28} strokeWidth={3} />
                        ) : node.availability === 'locked' ? (
                          <Lock size={24} />
                        ) : (
                          <JourneyArtwork title={node.title} source={node.artworkUrl} />
                        )}
                      </span>
                    </button>
                    {isCurrent && <span className="hall-you-are-here">Você está aqui</span>}
                    <span className="hall-node-copy">
                      <b>{node.title}</b>
                      <small>
                        {node.globalPosition}/{journey?.summary.totalModules} · {node.completedAulas}/{node.totalAulas} aulas
                      </small>
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {journey && <span className="sr-only">Progresso da aventura: {journey.summary.completedLessons} de {journey.summary.totalLessons} aulas.</span>}
      </div>
    </section>
  );
}

function JourneyArtwork({ title, source }: { title: string; source: string | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  if (failed) return <BookOpenCheck size={26} />;
  return <ProgressiveImage src={getModuleArtwork({ title, thumbnail: source, artworkUrl: source })} alt="" onError={() => setFailed(true)} />;
}
