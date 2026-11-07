import { gameAssets } from '@/lib/staticArtwork';

/**
 * Cor de cada carta pela paleta fixa da marca (D15): não usa `color`/`colorDark`
 * do banco, que são seeds antigos. Cada tom vira `data-tone` e o CSS
 * (`game-deck.css`) define faixa, janela da arte e tinta do texto.
 */
export type DeckTone = 'orange' | 'red' | 'pink' | 'blue' | 'yellow';

const TONE_BY_SLUG: Record<string, DeckTone> = {
  'quiz-relampago': 'orange',
  'caca-phishing': 'red',
  'classificacao-dados': 'pink',
  termotech: 'blue',
};

/** Slug desconhecido usa o amarelo da marca. */
export function deckToneFor(slug: string): DeckTone {
  return TONE_BY_SLUG[slug] ?? 'yellow';
}

const LOCAL_GAME_ART = new Set(Object.values(gameAssets));

/** Arte local dos jogos é pixel art; URLs externas só quando o nome indica `-pixel`. */
export function isPixelArt(src: string): boolean {
  return LOCAL_GAME_ART.has(src) || /-pixel\.(?:png|webp)(?:[?#]|$)/i.test(src);
}
