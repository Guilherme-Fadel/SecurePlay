import type { ArtBounds } from './artBounds';

/** Prancheta do PNG/SVG do tema do card, em px da própria arte. */
export const CARD_ART_WIDTH = 956;
export const CARD_ART_HEIGHT = 1080;

/** Faixas da moldura (fração da largura dela): esquerda | centro (enfeite do meio) | direita. */
const CENTER_START = 0.36;
const CENTER_END = 0.64;
/** Largura, em px da arte, da faixa esticada que preenche os vãos. */
const STRIP = 2;
/** Sobreposição entre pedaços vizinhos, em px do card, para não abrir fresta. */
const OVERLAP = 1;
const EPSILON = 0.01;

/** Destino (px do card) e origem (px da arte) de um pedaço da moldura. */
export interface CardFramePart {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

interface Frame { fx: number; fy: number; fw: number; fh: number }

/** Moldura inteira reduzida para caber no card e centralizada. */
function wholeFrame(frame: Frame, width: number, height: number): CardFramePart[] {
  const { fx, fy, fw, fh } = frame;
  const fit = Math.min(height / fh, width / fw);
  const dw = fw * fit;
  const dh = fh * fit;
  return [{ dx: (width - dw) / 2, dy: (height - dh) / 2, dw, dh, sx: fx, sy: fy, sw: fw, sh: fh }];
}

/** Esquerda, centro e direita intactos na escala da altura; os vãos recebem a faixa esticada. */
function stretchedFrame(frame: Frame, width: number, height: number): CardFramePart[] {
  const { fx, fy, fw, fh } = frame;
  const scale = height / fh;
  const leftEnd = fx + CENTER_START * fw;
  const rightStart = fx + CENTER_END * fw;
  const leftW = (leftEnd - fx) * scale;
  const centerW = (rightStart - leftEnd) * scale;
  const rightW = (fx + fw - rightStart) * scale;
  const centerX = (width - centerW) / 2;
  const rightX = width - rightW;

  const piece = (dx: number, dw: number, sx: number, sw: number): CardFramePart => ({ dx, dy: 0, dw, dh: height, sx, sy: fy, sw, sh: fh });
  const gap = (from: number, to: number, sx: number): CardFramePart[] => (
    to - from > EPSILON ? [piece(from - OVERLAP, to - from + 2 * OVERLAP, sx, STRIP)] : []
  );
  return [
    ...gap(leftW, centerX, leftEnd - STRIP),
    ...gap(centerX + centerW, rightX, rightStart),
    piece(0, leftW, fx, leftEnd - fx),
    piece(centerX, centerW, leftEnd, rightStart - leftEnd),
    piece(rightX, rightW, rightStart, fx + fw - rightStart),
  ];
}

/**
 * Pedaços que desenham a moldura num card W × H sem distorcê-la: escala pela altura; se sobra largura,
 * esquerda, centro e direita ficam intactos e só as barras de cima e de baixo se prolongam nos vãos;
 * se falta, a moldura inteira é reduzida e centralizada. Os vãos vêm antes, para os enfeites ficarem por cima.
 */
export function cardFrameParts(bounds: ArtBounds, width: number, height: number): CardFramePart[] {
  if (!(width > 0) || !(height > 0) || !(bounds.w > 0) || !(bounds.h > 0)) return [];
  const frame: Frame = { fx: bounds.x * CARD_ART_WIDTH, fy: bounds.y * CARD_ART_HEIGHT, fw: bounds.w * CARD_ART_WIDTH, fh: bounds.h * CARD_ART_HEIGHT };
  const scaledWidth = frame.fw * (height / frame.fh);
  return width < scaledWidth - EPSILON ? wholeFrame(frame, width, height) : stretchedFrame(frame, width, height);
}
