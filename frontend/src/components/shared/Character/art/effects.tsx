import type { CSSProperties } from 'react';
import { CREAM, K, PINK, YELLOW, outline, type ArtLibrary } from './palette';

const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });
const SPARKLE = '#FFF6C2';

/** [caminho, atraso] das quatro faíscas. */
const SPARKS: Array<[string, number]> = [
  ['M-12 18 Q-9.6 27.6 0 30 Q-9.6 32.4 -12 42 Q-14.4 32.4 -24 30 Q-14.4 27.6 -12 18 Z', 0],
  ['M176 6 Q177.8 14.2 186 16 Q177.8 17.8 176 26 Q174.2 17.8 166 16 Q174.2 14.2 176 6 Z', 0.8],
  ['M172 98 Q173.4 104.6 180 106 Q173.4 107.4 172 114 Q170.6 107.4 164 106 Q170.6 104.6 172 98 Z', 1.4],
  ['M-6 112 Q-4.8 117.2 0 118 Q-4.8 118.8 -6 124 Q-7.2 118.8 -12 118 Q-7.2 117.2 -6 112 Z', 2],
];

/** [caminho, cor, atraso] das quatro estrelas. */
const STARS: Array<[string, string, number]> = [
  ['M-14 30 l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z', YELLOW, 0],
  ['M178 14 l3.4 6.8 7.6.8-6 5.2 1.8 7.6-6.8-4.2-6.8 4.2 1.8-7.6-6-5.2 7.6-.8z', PINK, 0.7],
  ['M174 96 l3 6 7 .7-5.3 4.6 1.6 6.8-6.3-3.8-6.3 3.8 1.6-6.8-5.3-4.6 7-.7z', YELLOW, 1.3],
  ['M-4 104 l2.6 5.2 6 .6-4.6 4 1.4 5.8-5.4-3.2-5.4 3.2 1.4-5.8-4.6-4 6-.6z', CREAM, 1.9],
];

/** [cx, cy, raio, atraso] das bolhas. */
const BUBBLES = [[-10, 136, 9, 0], [172, 140, 7, 0.9], [12, 146, 5.5, 1.7], [150, 146, 10, 2.4]];

/** [x, y, escala, atraso] dos flocos de neve. */
const FLAKES = [
  [-24, 20, 1, 0], [184, 10, 0.75, 0.5], [-14, 120, 1, 1], [178, 92, 0.75, 1.5],
  [196, 150, 1, 0.3], [-34, 70, 0.75, 0.8], [150, -30, 1, 1.2], [0, -40, 0.75, 1.8],
];

const SUN_RAYS = 'M194 -30 L202 -30 M189.9 -20.1 L195.6 -14.4 M180 -16 L180 -8 M170.1 -20.1 L164.4 -14.4 M166 -30 L158 -30 M170.1 -39.9 L164.4 -45.6 M180 -44 L180 -52 M189.9 -39.9 L195.6 -45.6';

/** Efeitos luminosos; animados por `character.css` e parados com movimento reduzido. */
export const GLOW_EFFECTS: ArtLibrary = {
  brilhos: () => (
    <>
      {SPARKS.map(([d, wait]) => <path key={d} className="character-fx-spark" style={delay(wait)} d={d} fill={SPARKLE} stroke={K} strokeWidth="2" />)}
    </>
  ),
  estrelas: () => (
    <>
      {STARS.map(([d, fill, wait]) => <path key={d} className="character-fx-star" style={delay(wait)} d={d} fill={fill} {...outline(2)} />)}
    </>
  ),
  bolhas: () => (
    <>
      {BUBBLES.map(([cx, cy, r, wait]) => (
        <circle key={cx} className="character-fx-bubble" style={delay(wait)} cx={cx} cy={cy} r={r} fill="rgba(249,238,220,.35)" stroke={CREAM} strokeWidth="2.5" />
      ))}
    </>
  ),
  aura: ({ uid }) => (
    <>
      <defs>
        <radialGradient id={`${uid}-aura`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={YELLOW} stopOpacity=".85" />
          <stop offset=".6" stopColor={YELLOW} stopOpacity=".25" />
          <stop offset="1" stopColor={YELLOW} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="character-fx-pulse" cx="79.5" cy="74" rx="112" ry="104" fill={`url(#${uid}-aura)`} />
    </>
  ),
  neve: ({ uid }) => (
    <>
      <defs>
        <g id={`${uid}-flake`} stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round">
          <path d="M-7 0 H7 M0 -7 V7 M-5 -5 L5 5 M5 -5 L-5 5" />
        </g>
      </defs>
      {FLAKES.map(([x, y, scale, wait]) => (
        <g key={`${x}${y}`} transform={`translate(${x} ${y})${scale === 1 ? '' : ` scale(${scale})`}`}>
          <use className="character-fx-spark" style={delay(wait)} href={`#${uid}-flake`} />
        </g>
      ))}
    </>
  ),
  sol: () => (
    <>
      <path className="character-fx-pulse" d={SUN_RAYS} stroke={K} strokeWidth="7" strokeLinecap="round" />
      <path d={SUN_RAYS} stroke={YELLOW} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="180" cy="-30" r="10" fill={YELLOW} stroke={K} strokeWidth="3.5" />
    </>
  ),
};
