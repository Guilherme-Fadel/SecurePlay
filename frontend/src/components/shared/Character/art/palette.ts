import type { ReactElement } from 'react';

/** Cores da marca pelos tokens `--sp-*`; as demais são tons próprios das artes. */
export const K = 'var(--sp-black)';
export const RED = 'var(--sp-red)';
export const YELLOW = 'var(--sp-yellow)';
export const BLUE = 'var(--sp-blue)';
export const ORANGE = 'var(--sp-orange)';
export const PINK = 'var(--sp-pink)';
export const CREAM = 'var(--sp-cream)';
export const INK = 'var(--sp-ink-800)';
export const INK_SOFT = 'var(--sp-ink-600)';

/** Traço preto arredondado, comum às artes. */
export const outline = (width: number, join = true) => ({
  stroke: K,
  strokeWidth: width,
  ...(join ? { strokeLinejoin: 'round' as const } : {}),
});

export interface ArtProps {
  /** Prefixo único da instância; evita colisão de ids de gradientes e recortes. */
  uid: string;
  /** Cor da peça recolorível (da própria peça ou a do canvas). */
  color: string;
  /** Cor dos olhos do personagem. */
  eye: string;
}

export type ArtLibrary = Record<string, (props: ArtProps) => ReactElement>;
