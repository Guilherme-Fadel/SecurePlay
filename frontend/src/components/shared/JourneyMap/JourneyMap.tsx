import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Flag } from 'lucide-react';
import { Pebble, type PebbleState } from '@/components/ui/visuals/Pebble';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import {
  journeyBandPath,
  journeyGeometry,
  journeyStageBoundaries,
  journeyTrail,
  toPercent,
  type JourneyGeometry,
  type JourneyOrientation,
} from './journeyMapLayout';
import './journey-map.css';

export interface JourneyMapNode {
  id: number;
  title: string;
  /** Linha curta sob o título ("2/5 aulas", "Bloqueado"). */
  caption: string;
  art: string;
  state: PebbleState;
  /** Índice do território em `stages`. */
  stage: number;
  ariaLabel: string;
}

export interface JourneyMapStage {
  title: string;
  locked: boolean;
}

interface JourneyMapProps {
  nodes: JourneyMapNode[];
  stages: JourneyMapStage[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Nome acessível da lista de nós. */
  label: string;
  /** auto: horizontal ou vertical pela largura do contêiner; vertical: só a vertical. */
  orientation?: 'auto' | 'vertical';
  /** select: o nó seleciona (aria-pressed); open: o nó abre o módulo e o bloqueado não é interativo. */
  interaction?: 'select' | 'open';
  /** Território em destaque; os demais ficam esmaecidos. Sem valor, nenhum esmaece. */
  activeStage?: number | null;
  /** Texto da bandeira no fim da trilha. */
  flagLabel?: string;
  /**
   * Mapa vertical com altura dada pelo contêiner e rolagem própria (overscroll contido);
   * começa com o ponto atual centralizado. Sem valor, a vertical cresce com a trilha.
   */
  scrollable?: boolean;
}

/** Território 1, 2 e 3 = amarelo, rosa e azul (paleta fixa da marca). */
const STAGE_COLORS = ['var(--sp-yellow)', 'var(--sp-pink)', 'var(--sp-blue)'] as const;
const stageColor = (stage: number) => STAGE_COLORS[((stage % STAGE_COLORS.length) + STAGE_COLORS.length) % STAGE_COLORS.length];
const isBlueStage = (stage: number) => stageColor(stage) === STAGE_COLORS[2];

/** Ponto da trilha onde o personagem está: o nó atual ou, sem ele, a bandeira. */
function currentIndexOf(nodes: JourneyMapNode[]): number {
  const here = nodes.findIndex((node) => node.state === 'here');
  if (here >= 0) return here;
  return nodes.every((node) => node.state === 'done') ? nodes.length : 0;
}

/**
 * Mapa da jornada com N nós: horizontal no desktop e vertical em contêineres
 * abaixo de 900 px (container query). Cada nó é um botão que seleciona o
 * módulo (inclusive bloqueado); a ação fica no painel da tela que o usa.
 */
export function JourneyMap({ orientation = 'auto', interaction = 'select', activeStage = null, flagLabel = 'Fim da jornada', scrollable = false, ...rest }: JourneyMapProps) {
  const currentIndex = currentIndexOf(rest.nodes);
  const props = { ...rest, interaction, activeStage, flagLabel, scrollable };
  return (
    <div className={`jm${orientation === 'vertical' ? ' is-vertical-only' : ''}${scrollable ? ' is-scroll-y' : ''}`}>
      {orientation === 'auto' && <JourneyBoard {...props} board="horizontal" currentIndex={currentIndex} />}
      <JourneyBoard {...props} board="vertical" currentIndex={currentIndex} />
    </div>
  );
}

interface JourneyBoardProps extends Omit<JourneyMapProps, 'orientation' | 'interaction' | 'activeStage' | 'flagLabel' | 'scrollable'> {
  board: JourneyOrientation;
  currentIndex: number;
  interaction: 'select' | 'open';
  activeStage: number | null;
  flagLabel: string;
  scrollable: boolean;
}

function JourneyBoard({ board: orientation, nodes, stages, selectedId, onSelect, label, currentIndex, interaction, activeStage, flagLabel, scrollable }: JourneyBoardProps) {
  const stageOfNode = useMemo(() => nodes.map((node) => node.stage), [nodes]);
  const geometry = useMemo(() => journeyGeometry(nodes.length, orientation, stageOfNode), [nodes.length, orientation, stageOfNode]);
  const bands = useMemo(() => journeyStageBoundaries(geometry, stageOfNode), [geometry, stageOfNode]);
  const trail = useMemo(() => journeyTrail(geometry, currentIndex), [geometry, currentIndex]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const horizontal = orientation === 'horizontal';
  const firstStage = nodes[0]?.stage ?? 0;
  const hereNode = nodes[currentIndex];
  const herePoint = currentIndex >= nodes.length ? geometry.flag : geometry.slots[currentIndex];
  const hereStage = hereNode?.stage ?? nodes[nodes.length - 1]?.stage ?? firstStage;

  // Trilhas longas rolam dentro do mapa; o ponto atual começa visível (centralizado).
  const scrollsY = !horizontal && scrollable;
  useEffect(() => {
    const host = scrollRef.current;
    if (!host || !herePoint) return;
    if (horizontal) {
      const center = (herePoint.x / geometry.width) * host.scrollWidth;
      host.scrollLeft = Math.max(0, center - host.clientWidth / 2);
    } else if (scrollsY) {
      const center = (herePoint.y / geometry.height) * host.scrollHeight;
      host.scrollTop = Math.max(0, center - host.clientHeight / 2);
    }
  }, [horizontal, scrollsY, herePoint, geometry.width, geometry.height]);

  const stageLabels = stageLabelPositions(geometry, firstStage, bands);
  const boardStyle = {
    aspectRatio: `${geometry.width} / ${geometry.height}`,
    background: stageColor(firstStage),
    ...(horizontal ? { minWidth: `${horizontalMinWidth(geometry)}px` } : {}),
    '--jm-node': toPercent(geometry.nodeSize, geometry.width),
  } as CSSProperties;

  return (
    <div className={`jm-scroll is-${orientation}`} ref={scrollRef}>
      <div className={`jm-board is-${orientation}`} style={boardStyle}>
        <BoardArt geometry={geometry} bands={bands} trail={trail} firstStage={firstStage} activeStage={activeStage} />

        {stageLabels.map((item) => {
          const stage = stages[item.stage];
          if (!stage) return null;
          return (
            <span key={item.stage} className={`jm-stage${stage.locked ? ' is-locked' : ''}`} style={{ left: toPercent(item.x, geometry.width), top: toPercent(item.y, geometry.height) }} aria-hidden="true">
              {stage.title}
            </span>
          );
        })}

        <ol className="jm-nodes" aria-label={label}>
          {nodes.map((node, index) => {
            const slot = geometry.slots[index];
            if (!slot) return null;
            return (
              <JourneyNodeItem
                key={node.id}
                node={node}
                style={{ left: toPercent(slot.x, geometry.width), top: toPercent(slot.y, geometry.height) }}
                opens={interaction === 'open'}
                selected={node.id === selectedId}
                dim={activeStage !== null && node.stage !== activeStage}
                onSelect={onSelect}
              />
            );
          })}
        </ol>

        <div className="jm-flag" style={{ left: toPercent(geometry.flag.x, geometry.width), top: toPercent(geometry.flag.y, geometry.height) }} aria-hidden="true">
          <i><Flag size={22} strokeWidth={2.6} /></i>
          <span>{flagLabel}</span>
        </div>

        {herePoint && <HereMarker geometry={geometry} point={herePoint} blue={isBlueStage(hereStage)} />}
      </div>
    </div>
  );
}

interface JourneyNodeItemProps {
  node: JourneyMapNode;
  style: CSSProperties;
  opens: boolean;
  selected: boolean;
  dim: boolean;
  onSelect: (id: number) => void;
}

/** Parada do mapa: botão que seleciona (padrão) ou abre; em "open", a bloqueada não tem ação. */
function JourneyNodeItem({ node, style, opens, selected, dim, onSelect }: JourneyNodeItemProps) {
  const content = (
    <>
      <Pebble src={node.art} state={node.state} pixelated className="jm-pebble" />
      <span className="jm-label" aria-hidden="true">{node.title}<small>{node.caption}</small></span>
    </>
  );
  const itemClass = dim ? 'is-dim' : undefined;
  if (opens && node.state === 'locked') {
    return (
      <li className={itemClass} style={style}>
        <span className="jm-node is-locked is-static">{content}<span className="jm-sr">{node.ariaLabel}</span></span>
      </li>
    );
  }
  const pressed = !opens && selected;
  return (
    <li className={itemClass} style={style}>
      <button
        type="button"
        className={`jm-node is-${node.state}${pressed ? ' is-selected' : ''}`}
        aria-pressed={opens ? undefined : pressed}
        aria-current={node.state === 'here' ? 'step' : undefined}
        aria-label={node.ariaLabel}
        onClick={() => onSelect(node.id)}
      >
        {content}
      </button>
    </li>
  );
}

interface BoardArtProps {
  geometry: JourneyGeometry;
  bands: Array<{ stage: number; at: number }>;
  trail: { solid: string; dots: string };
  firstStage: number;
  activeStage: number | null;
}

/** Territórios, decoração, véu nos territórios fora de destaque e trilha (contínua até o ponto atual, pontilhada depois). */
function BoardArt({ geometry, bands, trail, firstStage, activeStage }: BoardArtProps) {
  const horizontal = geometry.orientation === 'horizontal';
  const regions: Array<{ stage: number; at: number | null }> = [{ stage: firstStage, at: null }, ...bands];
  const full = `M-10 -10 H ${geometry.width + 10} V ${geometry.height + 10} H -10 Z`;
  return (
    <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {bands.map((band) => <path key={`${band.stage}-${band.at}`} d={journeyBandPath(geometry, band.at)} fill={stageColor(band.stage)} />)}
      {horizontal
        ? <><circle cx="40" cy="40" r="34" fill="var(--sp-orange)" /><circle cx="98" cy="62" r="20" fill="var(--sp-orange)" /></>
        : <><circle cx="276" cy="30" r="26" fill="var(--sp-orange)" /><circle cx="240" cy="62" r="14" fill="var(--sp-orange)" /></>}
      {activeStage !== null && regions.map((region, index) => {
        if (region.stage === activeStage) return null;
        // Faixa do território menos a faixa seguinte (evenodd): o véu não cobre o território seguinte.
        const next = regions[index + 1];
        const own = region.at === null ? full : journeyBandPath(geometry, region.at);
        const cut = next && next.at !== null ? ` ${journeyBandPath(geometry, next.at)}` : '';
        return <path key={`veil-${region.stage}-${region.at ?? 'start'}`} className="jm-veil" d={own + cut} fillRule="evenodd" />;
      })}
      <path d={trail.dots} fill="none" stroke="var(--sp-black)" strokeWidth={horizontal ? 8 : 7} strokeLinecap="round" strokeDasharray={horizontal ? '0.1 18' : '0.1 16'} />
      <path d={trail.solid} fill="none" stroke="var(--sp-black)" strokeWidth={horizontal ? 15 : 13} strokeLinecap="round" />
      <path d={trail.solid} fill="none" stroke="var(--sp-cream)" strokeWidth={horizontal ? 7 : 6} strokeLinecap="round" />
    </svg>
  );
}

/** Personagem "Você está aqui"; no território azul troca para amarelo. */
function HereMarker({ geometry, point, blue }: { geometry: JourneyGeometry; point: { x: number; y: number }; blue: boolean }) {
  return (
    <div className="jm-here" style={herePosition(geometry, point)} aria-hidden="true">
      <span>Você está aqui</span>
      <BrandCharacter body={blue ? 'var(--sp-yellow)' : 'var(--sp-blue)'} face={blue ? 'var(--sp-black)' : 'var(--sp-cream)'} blink float />
    </div>
  );
}

/** Jornadas longas rolam dentro do mapa em vez de espremer os nós (escala mínima de 0,85). */
function horizontalMinWidth(geometry: JourneyGeometry): number {
  const byHeight = (geometry.width / geometry.height) * 240;
  return Math.round(geometry.width > 1200 ? Math.max(byHeight, geometry.width * 0.85) : byHeight);
}

function stageLabelPositions(geometry: JourneyGeometry, firstStage: number, bands: Array<{ stage: number; at: number }>) {
  const starts = [{ stage: firstStage, at: 0 }, ...bands];
  return starts.map((item, index) => geometry.orientation === 'horizontal'
    ? { stage: item.stage, x: index === 0 ? geometry.width * 0.015 : item.at + 18, y: geometry.height * 0.04 }
    : { stage: item.stage, x: geometry.width / 2, y: index === 0 ? 34 : item.at });
}

function herePosition(geometry: JourneyGeometry, point: { x: number; y: number }): CSSProperties {
  if (geometry.orientation === 'horizontal') {
    return { left: toPercent(point.x, geometry.width), top: toPercent(point.y - 44, geometry.height) };
  }
  const x = point.x < geometry.width / 2 ? point.x + 118 : point.x - 118;
  return { left: toPercent(x, geometry.width), top: toPercent(point.y + 50, geometry.height) };
}
