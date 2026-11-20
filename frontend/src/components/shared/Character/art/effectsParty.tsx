import { BLUE, INK, K, ORANGE, PINK, RED, YELLOW, outline, type ArtLibrary } from './palette';

const BALLOON = 'M0 -30 C20 -30 28 -10 24 6 C20 22 8 32 0 34 C-8 32 -20 22 -24 6 C-28 -10 -20 -30 0 -30 Z';
const EGG = 'M0 -14 C9 -14 12 -2 11 5 C10 12 5 15 0 15 C-5 15 -10 12 -11 5 C-12 -2 -9 -14 0 -14 Z';
const BAT = 'M0 0 C-6 -8 -14 -10 -26 -6 C-22 -2 -22 4 -26 8 C-18 4 -12 6 -8 10 C-6 4 -2 2 0 2 C2 2 6 4 8 10 C12 6 18 4 26 8 C22 4 22 -2 26 -6 C14 -10 6 -8 0 0 Z';

/** [posição, cor] dos dois balões. */
const BALLOONS: string[][] = [['translate(-30 10) rotate(-12)', RED], ['translate(190 0) rotate(12)', YELLOW]];

/** [x, y, cor] das bandeirinhas do varal; cada uma é um triângulo de 22 unidades. */
const FLAGS: Array<[number, number, string]> = [
  [-37, -15.6, RED], [-3, -7.2, YELLOW], [31, -2, BLUE], [65, 0, ORANGE], [99, -1.3, PINK], [133, -5.7, RED], [167, -13.3, BLUE],
];

/** [transformação, cor] dos ovos. */
const EGGS: string[][] = [['translate(-26 130) rotate(-14)', YELLOW], ['translate(188 136) rotate(12)', BLUE], ['translate(-8 150) rotate(8)', ORANGE]];

const BATS = ['translate(-26 10) scale(1.3)', 'translate(186 30) scale(1.1)', 'translate(170 -40) scale(.9)'];

/** [caminho, cor] das serpentinas. */
const STREAMERS: string[][] = [
  ['M-30 -10 C-10 0 -40 20 -20 30 C0 40 -30 56 -12 66', YELLOW],
  ['M184 0 C164 10 194 28 174 40 C154 52 186 64 168 78', PINK],
  ['M190 110 C176 116 196 130 182 138', 'var(--sp-cream)'],
];

/** Efeitos de festa. */
export const PARTY_EFFECTS: ArtLibrary = {
  baloes: () => (
    <>
      {BALLOONS.map(([transform, color]) => (
        <g key={transform} transform={transform}>
          <path d="M0 34 C6 54 -6 70 4 92" fill="none" stroke={K} strokeWidth="2" />
          <path d={BALLOON} fill={color} stroke={K} strokeWidth="4" />
          <path d="M-5 33 L5 33 L0 40 Z" fill={color} {...outline(3)} />
          <ellipse cx="-10" cy="-14" rx="5" ry="8" fill="#fff" opacity=".7" transform="rotate(20 -10 -14)" />
        </g>
      ))}
    </>
  ),
  bandeirinhas: () => (
    <>
      <path d="M-40 -20 Q80 30 200 -20" fill="none" stroke={K} strokeWidth="2.5" />
      {FLAGS.map(([x, y, color]) => (
        <path key={x} d={`M${x} ${y} L${x + 22} ${y} L${x + 11} ${y + 22} Z`} fill={color} {...outline(2.5)} />
      ))}
    </>
  ),
  morcegos: ({ uid }) => (
    <>
      <defs>
        <g id={`${uid}-bat`}>
          <path d={BAT} fill={INK} {...outline(2.5)} />
          <circle cx="-2.5" cy="-1" r="1.2" fill={YELLOW} />
          <circle cx="2.5" cy="-1" r="1.2" fill={YELLOW} />
        </g>
      </defs>
      {BATS.map((transform) => <use key={transform} href={`#${uid}-bat`} transform={transform} />)}
    </>
  ),
  ovos: () => (
    <>
      {EGGS.map(([transform, color]) => (
        <g key={transform} transform={transform}>
          <path d={EGG} fill={color} stroke={K} strokeWidth="3" />
          <path d="M-10 2 Q-5 -2 0 2 Q5 6 10 2" fill="none" stroke="#fff" strokeWidth="2.5" />
        </g>
      ))}
    </>
  ),
  serpentina: () => (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {STREAMERS.map(([d, color]) => (
        <g key={d}>
          <path d={d} stroke={K} strokeWidth="10" />
          <path d={d} stroke={color} strokeWidth="4" />
        </g>
      ))}
    </g>
  ),
};
