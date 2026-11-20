/*
 * Geometria e movimento da cortina do palco do Hall da Fama (sem dependências, testável em Node).
 * Sete faixas de veludo desenhadas em três posições com as mesmas formas (fechada, meio caminho e
 * aberta). Só a metade esquerda é calculada; a direita é o espelho. Sem prendedores laterais: a
 * cortina aberta fica recolhida para as bordas. O movimento é calculado quadro a quadro (as mesmas
 * posições, tempos e curvas do canvas aprovado) e aplicado pelo componente; não depende da linha do
 * tempo SMIL do <svg>, que não recomeça de forma confiável quando o desenho é montado depois.
 */

const BANDS = 7;
const GATHER_Y = 340;
const BOTTOM_Y = 652;

export interface CurtainShape {
  /** Largura da faixa no topo, no ponto médio do drapeado e na barra. */
  top: number;
  gather: number;
  bottom: number;
}

const CLOSED: CurtainShape = { top: 306, gather: 306, bottom: 306 };
const HALF: CurtainShape = { top: 244, gather: 206, bottom: 228 };
const OPEN: CurtainShape = { top: 166, gather: 104, bottom: 146 };

const round = (value: number) => String(Math.round(value * 10) / 10);

function band(shape: CurtainShape, from: number, to: number): string {
  const t0 = from * shape.top;
  const t1 = to * shape.top;
  const g0 = from * shape.gather;
  const g1 = to * shape.gather;
  const b0 = from * shape.bottom;
  const b1 = to * shape.bottom;
  const mid = (b0 + b1) / 2;
  return `M${round(t0)} -4 L${round(t1)} -4 C${round(t1)} 150 ${round(g1)} ${GATHER_Y - 110} ${round(g1)} ${GATHER_Y}`
    + ` C${round(g1)} ${GATHER_Y + 90} ${round(b1)} ${BOTTOM_Y - 150} ${round(b1)} ${BOTTOM_Y}`
    + ` Q${round(mid)} ${BOTTOM_Y + 12} ${round(b0)} ${BOTTOM_Y}`
    + ` C${round(b0)} ${BOTTOM_Y - 150} ${round(g0)} ${GATHER_Y + 90} ${round(g0)} ${GATHER_Y}`
    + ` C${round(g0)} ${GATHER_Y - 110} ${round(t0)} 150 ${round(t0)} -4 Z`;
}

/** Contorno da borda de dentro da cortina (a linha preta que acompanha o drapeado). */
function edge(shape: CurtainShape): string {
  return `M-4 -4 L${round(shape.top)} -4 C${round(shape.top)} 150 ${round(shape.gather)} ${GATHER_Y - 110} ${round(shape.gather)} ${GATHER_Y}`
    + ` C${round(shape.gather)} ${GATHER_Y + 90} ${round(shape.bottom)} ${BOTTOM_Y - 150} ${round(shape.bottom)} ${BOTTOM_Y} L-4 ${BOTTOM_Y} Z`;
}

export interface CurtainPaths {
  /** `d` de cada faixa, parada. */
  closed: string[];
  open: string[];
  closedEdge: string;
  openEdge: string;
}

export function curtainPaths(): CurtainPaths {
  const bands = (shape: CurtainShape) => Array.from({ length: BANDS }, (_, index) => band(shape, index / BANDS, (index + 1) / BANDS));
  return { closed: bands(CLOSED), open: bands(OPEN), closedEdge: edge(CLOSED), openEdge: edge(OPEN) };
}

/** Curva de suavização `cubic-bezier(x1, y1, x2, y2)` (a mesma do `keySplines` do canvas): progresso do tempo (0 a 1) no do movimento. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (time: number) => number {
  const axis = (a: number, b: number, u: number) => 3 * a * (1 - u) * (1 - u) * u + 3 * b * (1 - u) * u * u + u * u * u;
  return (time) => {
    if (time <= 0) return 0;
    if (time >= 1) return 1;
    let low = 0;
    let high = 1;
    for (let step = 0; step < 32; step += 1) {
      const mid = (low + high) / 2;
      if (axis(x1, x2, mid) < time) low = mid; else high = mid;
    }
    return axis(y1, y2, (low + high) / 2);
  };
}

interface Segment { from: CurtainShape; to: CurtainShape; start: number; end: number; ease: (time: number) => number }

/** Abrir: fechada, meio caminho aos 42% do tempo e aberta. Fechar: aberta e fechada. */
const MOTION: Record<'opening' | 'closing', Segment[]> = {
  opening: [
    { from: CLOSED, to: HALF, start: 0, end: 0.42, ease: cubicBezier(0.55, 0, 0.45, 1) },
    { from: HALF, to: OPEN, start: 0.42, end: 1, ease: cubicBezier(0.25, 0, 0.2, 1) },
  ],
  closing: [{ from: OPEN, to: CLOSED, start: 0, end: 1, ease: cubicBezier(0.5, 0, 0.5, 1) }],
};

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

/** A forma da cortina num instante do movimento (`time` de 0 a 1). */
export function curtainShape(motion: 'opening' | 'closing', time: number): CurtainShape {
  const segments = MOTION[motion];
  const segment = segments.find((item) => time <= item.end) ?? segments[segments.length - 1] as Segment;
  const local = (Math.min(1, Math.max(0, time)) - segment.start) / (segment.end - segment.start);
  const amount = segment.ease(Math.min(1, Math.max(0, local)));
  return {
    top: mix(segment.from.top, segment.to.top, amount),
    gather: mix(segment.from.gather, segment.to.gather, amount),
    bottom: mix(segment.from.bottom, segment.to.bottom, amount),
  };
}

export interface CurtainFrame { bands: string[]; edge: string }

/** O desenho de uma forma da cortina (as sete faixas e a borda). */
export function shapeFrame(shape: CurtainShape): CurtainFrame {
  return {
    bands: Array.from({ length: BANDS }, (_, index) => band(shape, index / BANDS, (index + 1) / BANDS)),
    edge: edge(shape),
  };
}

/** O desenho da cortina num instante (`time` de 0 a 1 do movimento); os extremos são exatamente as formas paradas. */
export function curtainFrame(motion: 'opening' | 'closing', time: number): CurtainFrame {
  return shapeFrame(curtainShape(motion, time));
}

export const CURTAIN_CLOSED: CurtainShape = CLOSED;
export const CURTAIN_OPEN: CurtainShape = OPEN;

/** Quanto a cortina está aberta (0 fechada, 1 aberta). */
export function curtainOpenness(shape: CurtainShape): number {
  return Math.min(1, Math.max(0, (CLOSED.top - shape.top) / (CLOSED.top - OPEN.top)));
}

const closeEase = cubicBezier(0.5, 0, 0.5, 1);

/** Fechar a partir de uma forma qualquer (por exemplo, no meio da abertura): vai da forma atual à fechada, sem passar pela aberta. */
export function closeFrom(shape: CurtainShape, time: number): CurtainShape {
  const amount = closeEase(Math.min(1, Math.max(0, time)));
  return {
    top: mix(shape.top, CLOSED.top, amount),
    gather: mix(shape.gather, CLOSED.gather, amount),
    bottom: mix(shape.bottom, CLOSED.bottom, amount),
  };
}

/** Duração de fechar a partir de uma forma: a do canvas (0,6 s) com a cortina toda aberta e proporcional ao que falta fechar (no mínimo 25%). */
export function closeMs(shape: CurtainShape): number {
  return Math.round(CURTAIN_MS.closing * Math.max(0.25, curtainOpenness(shape)));
}

/** Duração das fases da cortina, em milissegundos (a animação usa os mesmos valores). */
export const CURTAIN_MS = { wait: 650, opening: 1150, closing: 600, settle: 1300, confetti: 2700 } as const;
