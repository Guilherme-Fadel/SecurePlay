import type { ReactElement } from 'react';
import './brand-character.css';

/** Corpo e coroa do símbolo SecurePlay, os mesmos traços dos SVGs da marca. */
const SYMBOL_TRANSFORM = 'matrix(1 0 0 -1 114.2315 100.4042)';
const BODY_PATH = 'M24.992 80.248C12.298 93.583-8.017 100.251-35.968 100.251-63.903 100.251-83.901 93.733-95.972 80.727-108.026 67.703-114.074 50.396-114.074 28.817-114.074 7.221-108.026-10.236-95.972-23.571-83.901-36.906-63.903-43.574-35.968-43.574-8.017-43.574 12.298-36.906 24.992-23.571 37.704-10.236 44.042 7.221 44.042 28.817 44.042 49.772 37.704 66.913 24.992 80.248';
const FACE_PATH = 'M0 0C-7.494-6.648-24.607-7.544-31.769-7.616L-31.767-7.618H-31.98C-32.62-7.623-33.176-7.622-33.629-7.618H-36.402C-36.855-7.622-37.412-7.623-38.051-7.618H-38.075C-45.12-7.559-62.47-6.708-70.032 0-79.638 8.522-85.525 39.664-76.539 45.242-67.553 50.819-58.001 34.241-58.001 34.241-58.001 34.241-47.566 64.299-35.016 64.299-22.466 64.299-12.03 34.241-12.03 34.241-12.03 34.241-2.479 50.819 6.507 45.242 15.494 39.664 9.606 8.522 0 0';

/** Centro de rotação da coroa e dos olhos dentro do viewBox 159 × 144. */
const FACE_CENTER = '79.5 72';
const LEFT_EYE_X = 68.5;
const RIGHT_EYE_X = 89.9;
const EYE_Y = 83;

export type BrandCharacterExpression =
  | 'open'
  | 'happy'
  | 'wink'
  | 'sleepy'
  | 'closed'
  | 'surprised'
  /** Olhos abertos, voltados para cima e para a direita. */
  | 'curious'
  /** Olhos redondos e afastados: o susto do login. */
  | 'startled'
  /** Um olho aberto e o outro sorrindo. */
  | 'playful';

export interface BrandCharacterProps {
  /** Cor do corpo. */
  body?: string;
  /** Cor da coroa (o rosto). */
  face?: string;
  /** Cor dos olhos; por padrão, a do corpo. */
  eyes?: string;
  expression?: BrandCharacterExpression;
  /** Desloca o olhar na horizontal, em unidades do desenho (positivo = direita). */
  look?: number;
  /** Desloca o olhar na vertical (negativo = para cima). */
  lift?: number;
  /** Gira a coroa e os olhos, em graus. */
  faceRotation?: number;
  /** Pisca de tempos em tempos (só com olhos abertos). */
  blink?: boolean;
  /** Flutua para cima e para baixo. */
  float?: boolean;
  /** Texto para leitor de tela; sem ele, o personagem é decorativo. */
  label?: string;
  className?: string;
}

interface EyeProps { color: string; lx: number; rx: number; y: number }

const strokeStyle = (color: string) => ({ fill: 'none', stroke: color, strokeWidth: 7, strokeLinecap: 'round' as const });
const happyArc = (x: number, y: number) => `M${x - 6.5} ${y + 5} Q${x} ${y - 8} ${x + 6.5} ${y + 5}`;
const OpenEyes = ({ color, lx, rx, y }: EyeProps) => (
  <>
    <ellipse cx={lx} cy={y} rx="5" ry="10.9" fill={color} />
    <ellipse cx={rx} cy={y} rx="5" ry="10.9" fill={color} />
  </>
);

/** Um desenho de olhos por expressão; mesma geometria para todos os personagens. */
const EYES: Record<BrandCharacterExpression, (props: EyeProps) => ReactElement> = {
  open: OpenEyes,
  happy: ({ color, lx, rx, y }) => <path d={`${happyArc(lx, y)} ${happyArc(rx, y)}`} {...strokeStyle(color)} />,
  closed: ({ color, lx, rx, y }) => (
    <path d={`M${lx - 6.5} ${y} Q${lx} ${y + 7} ${lx + 6.5} ${y} M${rx - 6.5} ${y} Q${rx} ${y + 7} ${rx + 6.5} ${y}`} {...strokeStyle(color)} />
  ),
  wink: ({ color, lx, rx, y }) => (
    <>
      <ellipse cx={lx} cy={y} rx="5" ry="10.9" fill={color} />
      <path d={`M${rx - 6.5} ${y + 1} H${rx + 6.5}`} {...strokeStyle(color)} strokeWidth={6} />
    </>
  ),
  sleepy: ({ color, lx, rx, y }) => (
    <path d={`M${lx - 5} ${y - 3} h10 v4 a5 6.5 0 0 1 -10 0 z M${rx - 5} ${y - 3} h10 v4 a5 6.5 0 0 1 -10 0 z`} fill={color} />
  ),
  surprised: ({ color, lx, rx, y }) => (
    <>
      <ellipse cx={lx} cy={y} rx="6.6" ry="12.6" fill={color} />
      <ellipse cx={rx} cy={y} rx="6.6" ry="12.6" fill={color} />
    </>
  ),
  curious: ({ color, lx, rx, y }) => <OpenEyes color={color} lx={lx + 4} rx={rx + 4} y={y - 2.5} />,
  startled: ({ color, lx, rx, y }) => (
    <>
      <ellipse cx={lx - 1} cy={y} rx="7.4" ry="9.6" fill={color} />
      <ellipse cx={rx + 1} cy={y} rx="7.4" ry="9.6" fill={color} />
    </>
  ),
  playful: ({ color, lx, rx, y }) => (
    <>
      <ellipse cx={lx} cy={y} rx="5" ry="10.9" fill={color} />
      <path d={`M${rx - 6.9} ${y + 3} Q${rx} ${y - 5} ${rx + 6.9} ${y + 3}`} {...strokeStyle(color)} strokeWidth={6} />
    </>
  ),
};

/** O símbolo da marca como personagem: só os olhos e as cores mudam. */
const DEFAULTS = {
  body: 'var(--sp-blue)',
  face: 'var(--sp-cream)',
  expression: 'open',
  look: 0,
  lift: 0,
  faceRotation: 0,
  blink: false,
  float: false,
  className: '',
} satisfies BrandCharacterProps;

export function BrandCharacter(props: BrandCharacterProps) {
  const { body, face, eyes, expression, look, lift, faceRotation, blink, float, label, className } = { ...DEFAULTS, ...props };
  const eyeColor = eyes ?? body;
  const lx = LEFT_EYE_X + look;
  const rx = RIGHT_EYE_X + look;
  const y = EYE_Y + lift;
  const canBlink = blink && expression === 'open';
  const EyeShape = EYES[expression] ?? OpenEyes;
  const classes = ['brand-character', float ? 'brand-character--float' : '', className].filter(Boolean).join(' ');

  return (
    <svg
      className={classes}
      viewBox="0 0 159 144"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path transform={SYMBOL_TRANSFORM} fill={body} d={BODY_PATH} />
      <g transform={faceRotation ? `rotate(${faceRotation} ${FACE_CENTER})` : undefined}>
        <path transform={SYMBOL_TRANSFORM} fill={face} d={FACE_PATH} />
        <g className={canBlink ? 'brand-character__blink' : undefined}>
          <EyeShape color={eyeColor} lx={lx} rx={rx} y={y} />
        </g>
      </g>
    </svg>
  );
}
