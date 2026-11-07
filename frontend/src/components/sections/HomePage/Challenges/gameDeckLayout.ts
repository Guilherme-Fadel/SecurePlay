/**
 * Geometria do baralho para N cartas: leque (desktop) e pilha (mão com menos
 * de 700 px). Funções puras; o CSS cuida das transições e da distribuição.
 */
export type DeckMode = 'fan' | 'pile';

export const PILE_MAX_WIDTH = 700;
/** Cartas visíveis atrás da carta da frente na pilha. */
const PILE_DEPTH = 3;
const FRONT_Z = 100;

export interface CardPose {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  z: number;
  /** Fora da pilha visível: some e não recebe clique. */
  hidden: boolean;
}

export function deckModeFor(width: number): DeckMode {
  return width > 0 && width < PILE_MAX_WIDTH ? 'pile' : 'fan';
}

export function wrapIndex(index: number, total: number): number {
  return total > 0 ? ((index % total) + total) % total : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function fanPose(index: number, selected: number, total: number, width: number): CardPose {
  if (total <= 1) return { x: 0, y: -40, rotate: 0, scale: 1.06, z: FRONT_Z, hidden: false };
  const center = (total - 1) / 2;
  const k = index - center;
  const gap = clamp((width - 330) / (total - 1), 40, 185);
  const x = Math.round(k * gap);
  if (index === selected) return { x, y: -64, rotate: 0, scale: 1.1, z: FRONT_Z, hidden: false };
  const rotateStep = Math.min(7, 21 / center);
  const liftStep = Math.min(24, 72 / center);
  return {
    x,
    y: Math.round(Math.abs(k) * liftStep),
    rotate: Math.round(k * rotateStep * 10) / 10,
    scale: 0.94,
    z: 50 - Math.abs(index - selected),
    hidden: false,
  };
}

function pilePose(index: number, selected: number, total: number): CardPose {
  const offset = wrapIndex(index - selected, total);
  const depth = Math.min(offset, PILE_DEPTH);
  const shift = (Math.min(total - 1, PILE_DEPTH) * 14) / 2;
  return {
    x: depth * 14 - shift,
    y: -depth * 12,
    rotate: depth * 4,
    scale: 1 - depth * 0.05,
    z: offset === 0 ? FRONT_Z : 50 - offset,
    hidden: offset > PILE_DEPTH,
  };
}

export interface PoseInput {
  index: number;
  selected: number;
  total: number;
  mode: DeckMode;
  width: number;
}

export function poseFor({ index, selected, total, mode, width }: PoseInput): CardPose {
  return mode === 'pile' ? pilePose(index, selected, total) : fanPose(index, selected, total, width);
}

export function poseTransform(pose: CardPose): string {
  return `translate(${pose.x}px, ${pose.y}px) rotate(${pose.rotate}deg) scale(${pose.scale})`;
}

/** "Nº 01/04": posição e total reais, com dois dígitos. */
export function cardNumber(index: number, total: number): string {
  return `Nº ${String(index + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
}
