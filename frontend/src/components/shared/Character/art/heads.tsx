import type { SVGProps } from 'react';
import { BLUE, CREAM, INK, INK_SOFT, K, ORANGE, PINK, RED, YELLOW, outline, type ArtLibrary } from './palette';

const ear = { fill: CREAM, ...outline(4.5) };
const HORNS = 'M-24 -2 C-30 -26 -36 -46 -50 -68 M-34 -32 C-46 -34 -54 -40 -62 -50 M-42 -50 C-40 -62 -38 -70 -34 -84 M-50 -66 C-60 -68 -68 -74 -74 -84 M24 -2 C30 -26 36 -46 50 -68 M34 -32 C46 -34 54 -40 62 -50 M42 -50 C40 -62 38 -70 34 -84 M50 -66 C60 -68 68 -74 74 -84';
const PEAK = 'M14 -2 C40 -8 60 -2 66 8 C46 10 26 8 10 4 Z';
const DOME = 'M-38 3 C-40 -44 40 -44 38 3 Z';
const CONE = 'M-26 3 L4 -72 L26 3 Z';
const POMS = [-46, -34.75, -23.5, -12.25, -1, 10.25, 21.5, 32.75, 44];
const RAYS = 'M0 0 L13 0 M0 0 L9.2 9.2 M0 0 L0 13 M0 0 L-9.2 9.2 M0 0 L-13 0 M0 0 L-9.2 -9.2 M0 0 L0 -13 M0 0 L9.2 -9.2';
const BRIM = 'M-68 2 Q0 24 68 2 Q0 -18 -68 2 Z';
const CROWN = 'M-34 0 C-36 -30 -22 -46 0 -46 C22 -46 36 -30 34 0 Q0 8 -34 0 Z';

const JEWELS: Array<[number, number, number]> = [[4, 16, 6], [50, 6, 7], [96, 16, 6]];

const Poms = ({ r, ...rest }: { r: number } & SVGProps<SVGGElement>) => (
  <g {...rest}>{POMS.map((cx) => <circle key={cx} cx={cx} cy="2" r={r} />)}</g>
);

const Rabbit = ({ rotate }: { rotate: string }) => (
  <g transform={rotate}>
    <path d="M-30 -6 C-44 -40 -44 -86 -28 -98 C-12 -88 -10 -44 -14 -6 Z" {...ear} />
    <path d="M-27 -14 C-36 -42 -36 -76 -27 -88 C-19 -76 -18 -44 -20 -14 Z" fill={PINK} />
  </g>
);

/** Cabeça: desenhada em torno do ponto de fixação (0, 0), sobre o topo do corpo. */
export const HEADS: ArtLibrary = {
  coroa: ({ uid }) => (
    <g transform="translate(-39 -50) scale(.78)">
      <defs>
        <linearGradient id={`${uid}-gold`} x1="0" x2="1">
          <stop offset="0" stopColor="#C9A000" />
          <stop offset=".35" stopColor={YELLOW} />
          <stop offset=".55" stopColor="#FFE97A" />
          <stop offset="1" stopColor="#C9A000" />
        </linearGradient>
      </defs>
      <path d="M8 58 L4 18 L28 38 L50 8 L72 38 L96 18 L92 58 Z" fill={`url(#${uid}-gold)`} {...outline(4.5)} />
      <rect x="7" y="54" width="86" height="16" rx="5" fill="#E5BF00" stroke={K} strokeWidth="4.5" />
      {JEWELS.map(([cx, cy, r]) => (
        <circle key={cx} cx={cx} cy={cy} r={r} fill={YELLOW} stroke={K} strokeWidth="4" />
      ))}
      <circle cx="30" cy="62" r="4.5" fill={RED} stroke={K} strokeWidth="2.5" />
      <circle cx="50" cy="62" r="5" fill={BLUE} stroke={K} strokeWidth="2.5" />
      <circle cx="70" cy="62" r="4.5" fill={RED} stroke={K} strokeWidth="2.5" />
      <path d="M22 44 L18 26" stroke="#FFF3A6" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  cartola: ({ color }) => (
    <>
      <rect x="-27" y="-64" width="54" height="60" rx="6" fill={INK} stroke={K} strokeWidth="4" />
      <rect x="-27" y="-25" width="54" height="11" fill={color} stroke={K} strokeWidth="3" />
      <path d="M-17 -56 V-32" stroke="rgba(255,255,255,.3)" strokeWidth="5" strokeLinecap="round" />
      <path d="M-47 -3 Q0 9 47 -3 Q0 -15 -47 -3 Z" fill={INK} {...outline(4)} />
    </>
  ),
  bone: ({ color }) => (
    <>
      <path d={PEAK} fill={color} {...outline(4)} />
      <path d={DOME} fill={color} {...outline(4)} />
      <path d="M0 -32 V1" stroke="rgba(0,0,0,.22)" strokeWidth="3" />
      <path d="M-24 -16 Q-21 -29 -8 -34" stroke="rgba(255,255,255,.5)" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="0" cy="-33" r="5" fill={YELLOW} stroke={K} strokeWidth="3" />
    </>
  ),
  festa: ({ uid, color }) => (
    <g transform="rotate(-8)">
      <defs><clipPath id={`${uid}-cone`}><path d={CONE} /></clipPath></defs>
      <path d={CONE} fill={color} />
      <g clipPath={`url(#${uid}-cone)`}>
        <path d="M-40 -6 L40 -26 M-40 -26 L40 -46 M-40 -46 L40 -66" stroke={YELLOW} strokeWidth="9" />
        <path d="M8 -70 L26 3 L40 3 L40 -70 Z" fill="rgba(0,0,0,.18)" />
      </g>
      <path d={CONE} fill="none" {...outline(4.5)} />
      <path d="M-30 4 Q0 12 30 4" fill="none" stroke={K} strokeWidth="10" strokeLinecap="round" />
      <path d="M-30 4 Q0 12 30 4" fill="none" stroke={PINK} strokeWidth="6" strokeLinecap="round" strokeDasharray="3 3" />
      <g transform="translate(4 -74)" strokeLinecap="round">
        <path d={RAYS} stroke={K} strokeWidth="8" />
        <path d="M0 0 L13 0 M0 0 L0 13 M0 0 L-13 0 M0 0 L0 -13" stroke={YELLOW} strokeWidth="4" />
        <path d="M0 0 L9.2 9.2 M0 0 L-9.2 9.2 M0 0 L-9.2 -9.2 M0 0 L9.2 -9.2" stroke={ORANGE} strokeWidth="4" />
      </g>
    </g>
  ),
  chifres: () => (
    <>
      <path d={HORNS} fill="none" stroke={K} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
      <path d={HORNS} fill="none" stroke="#C85A00" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M-26 -8 C-31 -28 -37 -46 -48 -64 M26 -8 C31 -28 37 -46 48 -64" fill="none" stroke="#FFB27A" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  gorro: ({ color }) => (
    <>
      <path d="M-44 0 C-42 -46 6 -76 50 -50 C58 -46 64 -40 62 -30 C48 -42 34 -30 38 0 Z" fill={color} {...outline(4.5)} />
      <path d="M-30 -8 C-28 -40 0 -60 30 -52" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="5" strokeLinecap="round" />
      <path d="M20 -4 C18 -26 30 -40 46 -44" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="6" strokeLinecap="round" />
      <Poms r={12} fill={K} />
      <Poms r={9} fill={CREAM} />
      <circle cx="64" cy="-28" r="15" fill={K} />
      <circle cx="64" cy="-28" r="11.5" fill={CREAM} />
      <circle cx="60" cy="-32" r="3.5" fill="#fff" />
    </>
  ),
  bruxa: ({ color }) => (
    <g transform="rotate(6)">
      <path d="M-62 2 Q0 20 62 2 Q0 -14 -62 2 Z" fill={INK} {...outline(4.5)} />
      <path d="M-30 -2 C-26 -40 -6 -66 14 -84 C22 -90 34 -86 40 -78 C26 -80 16 -70 20 -50 C24 -30 28 -14 30 -2 Q0 6 -30 -2 Z" fill={INK_SOFT} {...outline(4.5)} />
      <path d="M-31 -14 Q0 -6 30 -14 L30 -2 Q0 6 -30 -2 Z" fill={color} {...outline(3.5)} />
      <rect x="-8" y="-17" width="16" height="15" rx="2" fill="none" stroke={YELLOW} strokeWidth="3.5" />
      <path d="M-18 -30 C-14 -50 -2 -66 10 -78" fill="none" stroke="#45454E" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  palha: ({ uid, color }) => (
    <>
      <defs>
        <pattern id={`${uid}-weave`} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 4 H8 M4 0 V8" stroke="#C9A000" strokeWidth="1.5" />
        </pattern>
      </defs>
      <path d={BRIM} fill={YELLOW} {...outline(4.5)} />
      <path d={BRIM} fill={`url(#${uid}-weave)`} opacity=".8" />
      <path d={CROWN} fill={YELLOW} {...outline(4.5)} />
      <path d={CROWN} fill={`url(#${uid}-weave)`} opacity=".8" />
      <path d="M-35 -10 Q0 -2 35 -10 L34 0 Q0 8 -34 0 Z" fill={color} {...outline(3.5)} />
      <g transform="rotate(12 17 -30)">
        <rect x="10" y="-36" width="14" height="12" rx="2" fill={BLUE} stroke={K} strokeWidth="3" />
        <path d="M12 -35 L22 -25" stroke={CREAM} strokeWidth="1.5" strokeDasharray="2 2" />
      </g>
      <rect x="-46" y="4" width="13" height="10" rx="2" fill={PINK} stroke={K} strokeWidth="3" transform="rotate(-10 -40 9)" />
      <path d="M60 4 L66 10 M54 8 L58 14 M-60 6 L-66 12" stroke={K} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  coelho: ({ color }) => (
    <>
      <Rabbit rotate="rotate(-8)" />
      <Rabbit rotate="scale(-1 1) rotate(-8)" />
      <path d="M-40 4 Q0 -18 40 4" fill="none" stroke={K} strokeWidth="10" strokeLinecap="round" />
      <path d="M-40 4 Q0 -18 40 4" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  helice: ({ uid, color }) => (
    <>
      <defs><clipPath id={`${uid}-cap`}><path d={DOME} /></clipPath></defs>
      <path d={PEAK} fill={BLUE} {...outline(4)} />
      <path d={DOME} fill={CREAM} />
      <g clipPath={`url(#${uid}-cap)`}>
        <path d="M-14 -40 L-20 6 L-4 6 L0 -40 Z M14 -40 L20 6 L36 6 L28 -40 Z M-40 -40 L-38 6 L-24 6 L-30 -40 Z" fill={color} />
        <path d="M10 -40 L40 6 L60 6 L60 -40 Z" fill="rgba(0,0,0,.14)" />
      </g>
      <path d={DOME} fill="none" {...outline(4)} />
      <path d="M0 -32 V-44" stroke={K} strokeWidth="5" />
      <path d="M0 -46 C-12 -54 -30 -52 -34 -46 C-30 -40 -12 -40 0 -46 C12 -52 30 -54 34 -46 C30 -40 12 -40 0 -46 Z" fill={YELLOW} {...outline(3.5)} />
      <circle cx="0" cy="-46" r="4" fill={RED} stroke={K} strokeWidth="2.5" />
    </>
  ),
};
