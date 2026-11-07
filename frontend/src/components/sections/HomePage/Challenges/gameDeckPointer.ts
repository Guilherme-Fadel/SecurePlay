import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent, type RefObject } from 'react';

/**
 * Ponteiro sobre a mão de cartas, sem re-render: escreve variáveis CSS no
 * elemento da mão.
 * - Inclinação e brilho (`--dk-rx/ry/hx/hy`, `data-live`): só mouse com
 *   `(pointer: fine)` e quando `tilt` está ligado (sem reduced-motion).
 * - Arraste na pilha (`--dk-dx`, `data-dragging`): passa de carta ao soltar
 *   além de 50 px; o clique que segue um arraste é descartado.
 */
const SWIPE_MIN = 50;
const DRAG_SLOP = 8;
const DRAG_MAX = 140;
const TILT_VARS = ['--dk-rx', '--dk-ry', '--dk-hx', '--dk-hy'];

interface DragState {
  id: number;
  startX: number;
  dx: number;
  moved: boolean;
}

interface UseDeckPointerOptions {
  handRef: RefObject<HTMLDivElement | null>;
  tilt: boolean;
  swipe: boolean;
  onSwipe: (delta: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

let finePointerQuery: MediaQueryList | null | undefined;

/** `matchMedia` guardado: o `.matches` acompanha mudanças sem recriar a consulta a cada movimento. */
function hasFinePointer(): boolean {
  if (finePointerQuery === undefined) {
    finePointerQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: fine)') : null;
  }
  return finePointerQuery?.matches === true;
}

function applyTilt(el: HTMLDivElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const mx = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
  const my = clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
  el.style.setProperty('--dk-rx', `${(-my * 8).toFixed(1)}deg`);
  el.style.setProperty('--dk-ry', `${(mx * 12).toFixed(1)}deg`);
  el.style.setProperty('--dk-hx', `${Math.round(50 + mx * 50)}%`);
  el.style.setProperty('--dk-hy', `${Math.round(50 + my * 50)}%`);
  el.setAttribute('data-live', '');
}

function clearDrag(el: HTMLDivElement, pointerId: number) {
  el.removeAttribute('data-dragging');
  el.style.removeProperty('--dk-dx');
  if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
}

export function useDeckPointer({ handRef, tilt, swipe, onSwipe }: UseDeckPointerOptions) {
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  /** Uma escrita de inclinação por quadro, com a última posição do ponteiro. */
  const tiltFrame = useRef<number | null>(null);
  const tiltPoint = useRef({ x: 0, y: 0 });

  const cancelTiltFrame = useCallback(() => {
    if (tiltFrame.current !== null) cancelAnimationFrame(tiltFrame.current);
    tiltFrame.current = null;
  }, []);

  useEffect(() => cancelTiltFrame, [cancelTiltFrame]);

  const scheduleTilt = (el: HTMLDivElement, clientX: number, clientY: number) => {
    tiltPoint.current = { x: clientX, y: clientY };
    if (tiltFrame.current !== null) return;
    tiltFrame.current = requestAnimationFrame(() => {
      tiltFrame.current = null;
      applyTilt(el, tiltPoint.current.x, tiltPoint.current.y);
    });
  };

  const resetTilt = useCallback(() => {
    cancelTiltFrame();
    const el = handRef.current;
    if (!el) return;
    el.removeAttribute('data-live');
    TILT_VARS.forEach((name) => el.style.removeProperty(name));
  }, [handRef, cancelTiltFrame]);

  useEffect(() => {
    if (!tilt) resetTilt();
  }, [tilt, resetTilt]);

  const moveDrag = (el: HTMLDivElement, event: PointerEvent<HTMLDivElement>): boolean => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return false;
    state.dx = event.clientX - state.startX;
    if (!state.moved && Math.abs(state.dx) > DRAG_SLOP) {
      state.moved = true;
      el.setAttribute('data-dragging', '');
      el.setPointerCapture(event.pointerId);
    }
    if (state.moved) el.style.setProperty('--dk-dx', `${clamp(state.dx, -DRAG_MAX, DRAG_MAX)}px`);
    return true;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>, commit: boolean) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    drag.current = null;
    clearDrag(event.currentTarget, event.pointerId);
    if (!state.moved) return;
    suppressClick.current = true;
    if (commit && Math.abs(state.dx) >= SWIPE_MIN) onSwipe(state.dx < 0 ? 1 : -1);
  };

  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      suppressClick.current = false;
      if (!swipe || (event.pointerType === 'mouse' && event.button !== 0)) return;
      drag.current = { id: event.pointerId, startX: event.clientX, dx: 0, moved: false };
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (swipe && moveDrag(event.currentTarget, event)) return;
      if (tilt && event.pointerType === 'mouse' && hasFinePointer()) scheduleTilt(event.currentTarget, event.clientX, event.clientY);
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => endDrag(event, true),
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => endDrag(event, false),
    onPointerLeave: resetTilt,
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    resetTilt,
  };
}
