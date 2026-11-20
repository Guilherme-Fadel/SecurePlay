import type { ReactElement } from 'react';
import { BODY_PATH, SYMBOL_TRANSFORM } from '../../BrandCharacter';
import { mixColor } from '../characterLook';
import { BLUE, CREAM, INK, K, ORANGE, YELLOW } from './palette';

/** Skins que trocam a cor do corpo por uma cor própria. */
export const SKIN_BODY_COLOR: Record<string, string> = { estrelado: INK, rena: '#B5652A', abobora: ORANGE };

export const SKIN_NAMES = ['lisa', 'veludo', 'pelucia', 'listras', 'estrelado', 'rena', 'confete', 'abobora'];

const TEXTURE = { x: -10, y: -10, width: 180, height: 170 } as const;
const ref = (uid: string, id: string) => `url(#${uid}-${id})`;
const GRID = 'userSpaceOnUse';

type Texture = (props: { uid: string }) => ReactElement;

/** Texturas aplicadas sobre o corpo, antes do sombreado. */
const TEXTURES: Record<string, Texture> = {
  listras: ({ uid }) => (
    <>
      <defs>
        <pattern id={`${uid}-str`} width="18" height="18" patternUnits={GRID} patternTransform="rotate(35)">
          <rect width="8" height="18" fill="rgba(255,255,255,.38)" />
        </pattern>
      </defs>
      <rect {...TEXTURE} fill={ref(uid, 'str')} />
    </>
  ),
  estrelado: ({ uid }) => (
    <>
      <defs>
        <pattern id={`${uid}-sky`} width="34" height="34" patternUnits={GRID}>
          <path d="M9 4 Q10 9 15 10 Q10 11 9 16 Q8 11 3 10 Q8 9 9 4 Z" fill={YELLOW} />
          <circle cx="26" cy="26" r="1.8" fill={CREAM} />
          <circle cx="24" cy="8" r="1.1" fill={CREAM} />
        </pattern>
      </defs>
      <rect {...TEXTURE} fill={ref(uid, 'sky')} />
    </>
  ),
  rena: ({ uid }) => (
    <>
      <defs>
        <pattern id={`${uid}-glit`} width="24" height="24" patternUnits={GRID}>
          <circle cx="5" cy="6" r="1.6" fill={YELLOW} />
          <circle cx="16" cy="3" r="1" fill="#FFF6C2" />
          <circle cx="12" cy="15" r="2" fill={YELLOW} />
          <circle cx="21" cy="19" r="1.2" fill="#FFF6C2" />
          <circle cx="3" cy="19" r="1" fill={YELLOW} />
        </pattern>
      </defs>
      <rect {...TEXTURE} fill={ref(uid, 'glit')} />
    </>
  ),
  confete: ({ uid }) => (
    <>
      <defs>
        <pattern id={`${uid}-conf`} width="40" height="40" patternUnits={GRID}>
          <rect x="4" y="6" width="7" height="4" rx="1.5" fill={YELLOW} transform="rotate(30 7 8)" />
          <rect x="22" y="4" width="7" height="4" rx="1.5" fill={BLUE} transform="rotate(-20 25 6)" />
          <rect x="30" y="22" width="7" height="4" rx="1.5" fill={CREAM} transform="rotate(60 33 24)" />
          <rect x="10" y="26" width="7" height="4" rx="1.5" fill={ORANGE} transform="rotate(-40 13 28)" />
          <rect x="20" y="34" width="7" height="4" rx="1.5" fill={YELLOW} transform="rotate(10 23 36)" />
        </pattern>
      </defs>
      <rect {...TEXTURE} fill={ref(uid, 'conf')} />
    </>
  ),
  abobora: () => (
    <path
      d="M28 0 Q20 72 30 150 M58 -6 Q52 72 58 150 M100 -6 Q106 72 100 150 M131 0 Q140 72 130 150"
      fill="none" stroke="#C85A00" strokeWidth="6"
    />
  ),
};

/** Brilho do veludo, aplicado depois do sombreado. */
function Velvet({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-vel`} cx="32%" cy="30%" r="80%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".45" />
          <stop offset=".45" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity=".28" />
        </radialGradient>
      </defs>
      <rect {...TEXTURE} fill={ref(uid, 'vel')} />
      <path d="M28 64 Q32 102 50 130 M131 62 Q129 100 112 130" fill="none" stroke="rgba(0,0,0,.16)" strokeWidth="7" strokeLinecap="round" />
    </>
  );
}

/** Pelagem da pelúcia: uma coroa de tufos ao redor do corpo. */
function FurRing({ color }: { color: string }) {
  const fur = { transform: SYMBOL_TRANSFORM, d: BODY_PATH, fill: 'none', strokeDasharray: '0 13', strokeLinecap: 'round' as const };
  return (
    <>
      <path {...fur} stroke={K} strokeWidth="34" />
      <path {...fur} stroke={color} strokeWidth="27" />
      <path transform={SYMBOL_TRANSFORM} d={BODY_PATH} fill="none" stroke={color} strokeWidth="16" />
    </>
  );
}

interface BodyProps {
  uid: string;
  /** Skin da biblioteca; `undefined` desenha o corpo liso (inclusive com skin enviada). */
  skin: string | undefined;
  body: string;
  compact: boolean;
}

/** Corpo do personagem: preenchimento, textura da skin, sombreado, contorno e brilho. */
export function CharacterBody({ uid, skin, body, compact }: BodyProps) {
  const Texture = skin ? TEXTURES[skin] : undefined;
  const fur = skin === 'pelucia';
  return (
    <>
      {fur && <FurRing color={body} />}
      <path transform={SYMBOL_TRANSFORM} fill={body} d={BODY_PATH} />
      <defs>
        <clipPath id={`${uid}-clip`}><path transform={SYMBOL_TRANSFORM} d={BODY_PATH} /></clipPath>
      </defs>
      <g clipPath={ref(uid, 'clip')}>
        {Texture && <Texture uid={uid} />}
        <ellipse cx="128" cy="128" rx="104" ry="74" fill={mixColor(body, 0.22, '#000000')} opacity=".85" />
        <ellipse cx="40" cy="30" rx="44" ry="22" fill={mixColor(body, 0.35, '#FFFFFF')} opacity=".75" transform="rotate(-24 40 30)" />
        {skin === 'veludo' && <Velvet uid={uid} />}
      </g>
      {!fur && <path transform={SYMBOL_TRANSFORM} fill="none" stroke={K} strokeWidth={compact ? 8 : 6} d={BODY_PATH} />}
      <ellipse cx="34" cy="30" rx="9" ry="5" fill="#fff" opacity=".9" transform="rotate(-30 34 30)" />
    </>
  );
}
