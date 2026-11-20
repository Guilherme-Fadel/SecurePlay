import { BLUE, CREAM, INK, K, ORANGE, PINK, RED, YELLOW, outline, type ArtLibrary } from './palette';

const MASK = 'M-44 -6 C-36 -22 -14 -20 0 -10 C14 -20 36 -22 44 -6 C46 8 34 18 18 16 C8 14 4 8 0 8 C-4 8 -8 14 -18 16 C-34 18 -46 8 -44 -6 Z';

/** Fita da máscara: contorno preto por baixo e a cor por cima. */
const Strap = ({ d, color, width }: { d: string; color: string; width: number }) => (
  <>
    <path d={d} fill="none" stroke={K} strokeWidth={width + 6} strokeLinecap="round" />
    <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
  </>
);

/** Rosto: desenhado em torno do ponto de fixação (0, 0), sobre os olhos. */
export const FACES: ArtLibrary = {
  nariz: () => (
    <>
      <circle cx="0" cy="10" r="10" fill={RED} stroke={K} strokeWidth="4" />
      <ellipse cx="-3" cy="6.5" rx="3.5" ry="2.4" fill="#fff" opacity=".9" />
    </>
  ),
  oculos: () => (
    <g transform="translate(0 -6)">
      <path d="M-22 -2 H22" stroke={K} strokeWidth="5" />
      <path d="M-38 -10 Q-38 -14 -32 -14 H-6 Q-2 -14 -2 -8 Q-4 10 -20 12 Q-36 10 -38 -10 Z" fill={INK} {...outline(4)} />
      <path d="M38 -10 Q38 -14 32 -14 H6 Q2 -14 2 -8 Q4 10 20 12 Q36 10 38 -10 Z" fill={INK} {...outline(4)} />
      <path d="M-30 -8 L-20 -8 M10 -8 L20 -8" stroke="#8DAEFF" strokeWidth="3" strokeLinecap="round" />
      <path d="M-27 2 L-13 -8" stroke="rgba(255,255,255,.5)" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  mascara: ({ eye }) => (
    <g transform="translate(0 -6)">
      <path d={MASK} fill={PINK} {...outline(4)} />
      {[-10.7, 10.7].map((cx) => <ellipse key={cx} cx={cx} cy="-1" rx="9" ry="13" fill={CREAM} stroke={K} strokeWidth="2.5" />)}
      {[-10.7, 10.7].map((cx) => <ellipse key={cx} cx={cx} cy="-1" rx="5.4" ry="11.2" fill={eye} />)}
      <path d="M-44 -6 C-36 -22 -14 -20 0 -10 C14 -20 36 -22 44 -6" fill="none" stroke={YELLOW} strokeWidth="3" />
      <Strap d="M40 -14 C52 -40 64 -52 82 -58" color={BLUE} width={7} />
      <Strap d="M42 -10 C60 -30 74 -36 92 -36" color={YELLOW} width={6} />
      <Strap d="M38 -18 C44 -46 50 -62 60 -76" color={ORANGE} width={6} />
    </g>
  ),
};
