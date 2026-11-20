import { useLayoutEffect, useRef } from 'react';
import type { CurtainPhase } from './curtainFlow';
import {
  CURTAIN_CLOSED, CURTAIN_MS, CURTAIN_OPEN, closeFrom, closeMs, curtainPaths, curtainShape, shapeFrame, type CurtainPaths, type CurtainShape,
} from './hallCurtainPaths';

const PATHS: CurtainPaths = curtainPaths();

interface CurtainDrawProps { uid: string; phase: CurtainPhase }

/** A forma de cada instante da fase: abrir segue o canvas; fechar parte da forma em que a cortina estava (aberta, ou no meio da abertura). */
function shapeOf(phase: 'opening' | 'closing', from: CurtainShape, time: number): CurtainShape {
  return phase === 'opening' ? curtainShape('opening', time) : closeFrom(from, time);
}

/**
 * Anima as faixas (e a borda) por quadro, com os tempos e curvas do canvas: abrir em 1,15 s e fechar
 * em 0,6 s. Cada troca de fase recomeça do zero, medida pelo relógio da página (não pela linha do
 * tempo SMIL do <svg>, que não recomeça quando só o desenho muda). O último quadro é exatamente a
 * forma parada da fase seguinte. A forma desenhada por último fica num ref: se a cena muda no meio da
 * abertura, a cortina fecha a partir de onde estava em vez de saltar para toda aberta.
 */
function useCurtainMotion(phase: CurtainPhase) {
  const group = useRef<SVGGElement>(null);
  const current = useRef<CurtainShape>(CURTAIN_CLOSED);
  useLayoutEffect(() => {
    if (phase === 'closed' || phase === 'open') {
      current.current = phase === 'open' ? CURTAIN_OPEN : CURTAIN_CLOSED;
      return undefined;
    }
    const shapes = group.current ? Array.from(group.current.querySelectorAll('path')) : [];
    const from = current.current;
    const duration = phase === 'opening' ? CURTAIN_MS.opening : closeMs(from);
    const start = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const time = Math.min(1, (now - start) / duration);
      current.current = shapeOf(phase, from, time);
      const next = shapeFrame(current.current);
      shapes.forEach((shape, index) => shape.setAttribute('d', next.bands[index] ?? next.edge));
      if (time < 1) frame = requestAnimationFrame(draw);
    };
    draw(start);
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [phase]);
  return group;
}

/** Metade esquerda em sete faixas de veludo; a direita é o espelho (<use>), então anima junto. */
function CurtainHalf({ uid, phase }: CurtainDrawProps) {
  const half = `${uid}-half`;
  const group = useCurtainMotion(phase);
  const opened = phase === 'open' || phase === 'closing';
  const still = opened ? PATHS.open : PATHS.closed;
  return (
    <>
      <g id={half} ref={group}>
        {still.map((d, index) => <path key={index} d={d} fill={`url(#${uid}-vel${index % 2})`} />)}
        <path className="hall-ink hall-curtain-edge" d={opened ? PATHS.openEdge : PATHS.closedEdge} fill="none" />
      </g>
      <use href={`#${half}`} transform="translate(600 0) scale(-1 1)" />
    </>
  );
}

/**
 * Cortina de teatro, sem prendedores: fechada, abrindo, fechando ou aberta (recolhida às bordas).
 * Com movimento reduzido o palco só usa `closed` e `open`, sem animar.
 */
export function HallCurtain({ uid, phase }: CurtainDrawProps) {
  return (
    <svg className="hall-layer hall-curtain" viewBox="0 0 600 640" aria-hidden="true" focusable="false">
      <CurtainHalf uid={uid} phase={phase} />
    </svg>
  );
}
