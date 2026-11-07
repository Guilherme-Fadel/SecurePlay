import type { CSSProperties, ReactNode } from 'react';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/styles/app-ui.css';

export type PebbleState = 'done' | 'here' | 'next' | 'locked';

/* Contorno do símbolo SecurePlay (mesmo desenho dos nós do mapa da landing). */
const PEBBLE_PATH = 'M24.992 80.248C12.298 93.583-8.017 100.251-35.968 100.251-63.903 100.251-83.901 93.733-95.972 80.727-108.026 67.703-114.074 50.396-114.074 28.817-114.074 7.221-108.026-10.236-95.972-23.571-83.901-36.906-63.903-43.574-35.968-43.574-8.017-43.574 12.298-36.906 24.992-23.571 37.704-10.236 44.042 7.221 44.042 28.817 44.042 49.772 37.704 66.913 24.992 80.248';
const SYMBOL_TRANSFORM = 'matrix(1 0 0 -1 114.2315 100.4042)';

interface PebbleProps {
  /** Arte exibida dentro da moldura (módulo, conquista, território). */
  src?: string;
  /** Texto alternativo da arte; vazio quando o texto ao lado já a identifica. */
  alt?: string;
  /** done: contorno contínuo e selo de concluído; here: contorno azul grosso;
   *  next: contorno tracejado; locked: areia escura, arte em cinza e cadeado. */
  state?: PebbleState;
  /** Largura (px ou valor CSS); a altura segue a proporção do símbolo (159:144). */
  size?: number | string;
  /** Estado anunciado a leitores de tela quando o contexto não o descreve. */
  stateLabel?: string;
  /** Mantém pixels nítidos em pixel art. */
  pixelated?: boolean;
  /** Conteúdo central no lugar da arte, como um número de etapa. */
  children?: ReactNode;
  className?: string;
}

function sizeStyle(size: PebbleProps['size']): CSSProperties | undefined {
  if (size === undefined) return undefined;
  return { width: typeof size === 'number' ? `${size}px` : size };
}

export function Pebble({ src, alt = '', state = 'next', size, stateLabel, pixelated = false, children, className }: PebbleProps) {
  return (
    <span className={cn('app-pebble', `is-${state}`, className)} style={sizeStyle(size)}>
      <svg viewBox="-5 -5 169 154" aria-hidden="true" focusable="false">
        <path transform={SYMBOL_TRANSFORM} d={PEBBLE_PATH} />
      </svg>
      {src && <img src={src} alt={alt} className={pixelated ? 'is-pixelated' : undefined} decoding="async" draggable={false} />}
      {children !== undefined && children !== null && <span className="app-pebble-content">{children}</span>}
      {state === 'done' && <span className="app-pebble-badge" aria-hidden="true"><Check size={14} strokeWidth={3.6} /></span>}
      {state === 'locked' && <span className="app-pebble-badge is-locked" aria-hidden="true"><Lock size={13} strokeWidth={3} /></span>}
      {stateLabel && <span className="app-pebble-sr">{stateLabel}</span>}
    </span>
  );
}
