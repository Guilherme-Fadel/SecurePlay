import type { CharacterLook, LookPiece } from '@/services/dashboard';

export type { CharacterLook, LookPiece };

export type CharacterVariant = 'full' | 'compact';
export type CharacterSlot = 'skin' | 'face' | 'neck' | 'head' | 'effect';
export type PieceAdjust = LookPiece['adjust'];

export interface CharacterLayer {
  slot: CharacterSlot;
  piece: LookPiece;
  position: 'back' | 'body' | 'front';
}

export const CHARACTER_VIEWBOX = { full: '-40 -100 239 270', compact: '-14 -56 187 216' } as const;

/** Prancheta do modelo: 956 × 1080 px, 4 px por unidade, origem em (160, 400). */
export const ARTBOARD = { x: -40, y: -100, width: 239, height: 270 } as const;

/** Ponto de fixação de cada encaixe, nas coordenadas do personagem. */
export const SLOT_ANCHOR: Record<CharacterSlot, readonly [number, number]> = {
  skin: [79.5, 35],
  head: [79.5, 4],
  face: [79.2, 88],
  neck: [79.5, 112],
  effect: [79.5, 35],
};

const DEFAULT_ADJUST: PieceAdjust = { x: 0, y: 0, scale: 1 };
const BODY_SLOTS = ['skin', 'face', 'neck', 'head'] as const;

/** Encaixes do personagem, de trás para a frente; fundo e card pertencem ao palco e ao card. */
export function characterLayers(look: CharacterLook, variant: CharacterVariant): CharacterLayer[] {
  const layers: CharacterLayer[] = [];
  const effect = variant === 'compact' ? undefined : look.effect;
  if (effect?.layer === 'back') layers.push({ slot: 'effect', piece: effect, position: 'back' });
  for (const slot of BODY_SLOTS) {
    const piece = look[slot];
    if (piece) layers.push({ slot, piece, position: 'body' });
  }
  if (effect && effect.layer !== 'back') layers.push({ slot: 'effect', piece: effect, position: 'front' });
  return layers;
}

const num = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);
const fmt = (value: number) => String(Math.round(value * 10000) / 10000);

/** Deslocamento e escala em torno da âncora do encaixe; ajuste padrão não gera transformação. */
export function pieceTransform(slot: CharacterSlot, adjust: PieceAdjust | undefined): string {
  const x = num(adjust?.x ?? 0, 0);
  const y = num(adjust?.y ?? 0, 0);
  const scale = adjust && Number.isFinite(adjust.scale) && adjust.scale > 0 ? adjust.scale : DEFAULT_ADJUST.scale;
  const [ax, ay] = SLOT_ANCHOR[slot];
  const parts: string[] = [];
  if (x !== 0 || y !== 0) parts.push(`translate(${fmt(x)} ${fmt(y)})`);
  if (scale !== 1) parts.push(`translate(${ax} ${ay}) scale(${fmt(scale)}) translate(${-ax} ${-ay})`);
  return parts.join(' ');
}

const HEX = /^#[0-9a-f]{6}$/i;
const channel = (from: number, to: number, t: number) => Math.round(from + (to - from) * t);
const hex2 = (value: number) => value.toString(16).padStart(2, '0');

/** Mistura `color` com `to` na proporção `t`; cores que não são hexadecimais (tokens) usam color-mix. */
export function mixColor(color: string, t: number, to: string): string {
  if (!HEX.test(color) || !HEX.test(to)) {
    return `color-mix(in srgb, ${color} ${Math.round((1 - t) * 100)}%, ${to})`;
  }
  const a = parseInt(color.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const rgb = [16, 8, 0].map((shift) => channel((a >> shift) & 255, (b >> shift) & 255, t));
  return `#${rgb.map(hex2).join('')}`;
}

/** Arte enviada só é desenhada se vier de http(s) ou da própria origem. */
export function isSafeArtUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//'));
}
