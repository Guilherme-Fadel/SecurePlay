/**
 * Geometria do mapa da jornada (canvas Home-tela V4 "Mapa da landing").
 * Calcula slots, trilha e faixas de território para qualquer quantidade de
 * nós, na horizontal (desktop) e na vertical (abaixo de 900 px). Tudo em
 * unidades do viewBox; a tela converte para porcentagem.
 * Reaproveitado pelo mapa do Aprender (Parte 6).
 */
export type JourneyOrientation = 'horizontal' | 'vertical';

export interface JourneyPoint { x: number; y: number }

export interface JourneyGeometry {
  orientation: JourneyOrientation;
  width: number;
  height: number;
  /** Um ponto por nó, na ordem da jornada. */
  slots: JourneyPoint[];
  /** Bandeira de fim da jornada, depois do último nó. */
  flag: JourneyPoint;
  /** Largura do nó em unidades do viewBox. */
  nodeSize: number;
}

const H_HEIGHT = 390;
const H_MARGIN = 95;
const H_STEP = 170;
const H_MIN_WIDTH = 1200;
const H_ROWS: readonly [number, number] = [282, 188];

const V_WIDTH = 300;
const V_START = 100;
const V_STEP = 160;
/** Espaço extra entre territórios na vertical, onde fica o nome do território. */
const V_STAGE_GAP = 70;
const V_END = 80;
const V_COLUMNS: readonly [number, number] = [85, 215];

/** `stageOfNode` abre espaço para o nome do território entre etapas (só na vertical). */
export function journeyGeometry(count: number, orientation: JourneyOrientation, stageOfNode: readonly number[] = []): JourneyGeometry {
  const nodes = Math.max(0, Math.floor(count));
  const points = nodes + 1;
  if (orientation === 'horizontal') {
    const width = Math.max(H_MIN_WIDTH, H_MARGIN * 2 + H_STEP * nodes);
    const step = (width - H_MARGIN * 2) / Math.max(1, points - 1);
    const all = Array.from({ length: points }, (_, index) => ({
      x: Math.round(H_MARGIN + step * index),
      y: H_ROWS[index % 2],
    }));
    const flag = all[nodes] ?? { x: width - H_MARGIN, y: H_ROWS[0] };
    return { orientation, width, height: H_HEIGHT, slots: all.slice(0, nodes), flag, nodeSize: 84 };
  }
  const all: JourneyPoint[] = [];
  let y = V_START;
  for (let index = 0; index < points; index += 1) {
    if (index > 0) {
      const changes = index < nodes && stageOfNode[index] !== undefined && stageOfNode[index] !== stageOfNode[index - 1];
      y += V_STEP + (changes ? V_STAGE_GAP : 0);
    }
    all.push({ x: V_COLUMNS[index % 2], y });
  }
  const flag = all[nodes] ?? { x: V_COLUMNS[0], y: V_START };
  return { orientation, width: V_WIDTH, height: flag.y + V_END, slots: all.slice(0, nodes), flag, nodeSize: 75 };
}

function segment(a: JourneyPoint, b: JourneyPoint, orientation: JourneyOrientation): string {
  return orientation === 'horizontal'
    ? ` C ${a.x + 80} ${a.y}, ${b.x - 80} ${b.y}, ${b.x} ${b.y}`
    : ` C ${a.x} ${a.y + 65}, ${b.x} ${b.y - 65}, ${b.x} ${b.y}`;
}

/** Trilha contínua até o ponto atual e pontilhada dali até a bandeira. */
export function journeyTrail(geometry: JourneyGeometry, currentIndex: number) {
  const points = [...geometry.slots, geometry.flag];
  const cut = Math.max(0, Math.min(points.length - 1, currentIndex));
  const start = points[0] ?? geometry.flag;
  const here = points[cut] ?? start;
  let solid = `M${start.x} ${start.y}`;
  let dots = `M${here.x} ${here.y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    if (!a || !b) continue;
    if (index < cut) solid += segment(a, b, geometry.orientation);
    else dots += segment(a, b, geometry.orientation);
  }
  return { solid, dots };
}

/** Início de cada território (exceto o primeiro, que é o fundo do mapa). */
export function journeyStageBoundaries(geometry: JourneyGeometry, stageOfNode: number[]): Array<{ stage: number; at: number }> {
  const result: Array<{ stage: number; at: number }> = [];
  const axis = (point: JourneyPoint) => (geometry.orientation === 'horizontal' ? point.x : point.y);
  for (let index = 1; index < stageOfNode.length; index += 1) {
    const previous = stageOfNode[index - 1];
    const stage = stageOfNode[index];
    const a = geometry.slots[index - 1];
    const b = geometry.slots[index];
    if (stage === undefined || previous === undefined || stage === previous || !a || !b) continue;
    // Na vertical o nome fica no espaço extra, logo acima do primeiro nó da etapa.
    const at = geometry.orientation === 'horizontal' ? Math.round((axis(a) + axis(b)) / 2) : axis(b) - 72;
    result.push({ stage, at });
  }
  return result;
}

/** Faixa ondulada de um território, do limite até o fim do mapa. */
export function journeyBandPath(geometry: JourneyGeometry, at: number): string {
  const { width: w, height: h } = geometry;
  if (geometry.orientation === 'horizontal') {
    const x = at;
    return `M${x} 0 H ${w} V ${h} H ${x} C ${x - 5} ${h * 0.94}, ${x - 15} ${h * 0.8}, ${x} ${h * 0.7} C ${x + 40} ${h * 0.49}, ${x - 30} ${h * 0.26}, ${x} 0 Z`;
  }
  const y = at;
  return `M-10 ${y} C 60 ${y - 25}, 120 ${y + 30}, 180 ${y + 2} C 240 ${y - 24}, 280 ${y + 10}, 310 ${y - 10} V ${h + 10} H -10 Z`;
}

export const toPercent = (value: number, total: number) => `${Math.round((value / total) * 10000) / 100}%`;
