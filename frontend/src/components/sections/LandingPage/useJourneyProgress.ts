import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { useMotionValue, useReducedMotion } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { journeySnapshot } from './journey';
import type { JourneySnapshot } from './journey';

/**
 * Progresso (0 a 1) do mapa fixo enquanto a seção rola. Segue a medição da
 * prancheta: o curso é o espaço que o mapa percorre parado dentro da seção.
 * Devolve null quando a seção inteira cabe na tela (mantém o último valor).
 */
function measure(section: HTMLElement, pin: HTMLElement, head: HTMLElement): number | null {
  const rect = section.getBoundingClientRect();
  const viewport = window.innerHeight || document.documentElement.clientHeight;
  if (rect.top >= 0 && rect.bottom <= viewport) return null;
  const { start, travel } = journeyCourse(section, pin, head);
  return travel > 0 ? Math.min(1, Math.max(0, -start / travel)) : 1;
}

/**
 * Curso do mapa na rolagem atual: `start` é quanto falta (px) para o mapa prender
 * (negativo depois que prendeu) e `travel` é o trecho em que ele fica preso.
 */
function journeyCourse(section: HTMLElement, pin: HTMLElement, head: HTMLElement): { start: number; travel: number } {
  const rect = section.getBoundingClientRect();
  const sectionStyle = window.getComputedStyle(section);
  const pinStyle = window.getComputedStyle(pin);
  const paddingTop = parseFloat(sectionStyle.paddingTop) || 0;
  const paddingBottom = parseFloat(sectionStyle.paddingBottom) || 0;
  const pinRect = pin.getBoundingClientRect();
  const headRect = head.getBoundingClientRect();
  const sideBySide = pinRect.left >= headRect.right - 2;
  const offset = sideBySide ? 0 : (headRect.bottom - (rect.top + paddingTop)) + (parseFloat(pinStyle.marginTop) || 0);
  const travel = rect.height - paddingTop - paddingBottom - offset - pinRect.height;
  const stickyTop = parseFloat(pinStyle.top) || 0;
  return { start: rect.top + paddingTop + offset - stickyTop, travel };
}

/** Trecho da rolagem (posições absolutas de scrollY) em que a jornada é percorrida. */
export function journeyScrollRange(): { from: number; to: number } | null {
  const section = document.getElementById('jornada');
  const pin = section?.querySelector<HTMLElement>('.lp-jr-pin');
  const head = section?.querySelector<HTMLElement>('.lp-jr-head');
  if (!section || !pin || !head) return null;
  const { start, travel } = journeyCourse(section, pin, head);
  const from = window.scrollY + start;
  return { from, to: from + Math.max(travel, 0) };
}

/**
 * O valor contínuo fica num MotionValue (trilha e personagem sem re-render a cada
 * quadro); o estado discreto só atualiza ao cruzar uma parada. Com movimento
 * reduzido, a trilha aparece completa e parada.
 */
export function useJourneyProgress(
  sectionRef: RefObject<HTMLElement | null>,
  pinRef: RefObject<HTMLElement | null>,
  headRef: RefObject<HTMLElement | null>,
): { progress: MotionValue<number>; snapshot: JourneySnapshot } {
  const reduceMotion = useReducedMotion();
  const progress = useMotionValue(reduceMotion ? 1 : 0);
  const [snapshot, setSnapshot] = useState(() => journeySnapshot(reduceMotion ? 1 : 0));

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      const pin = pinRef.current;
      const head = headRef.current;
      if (!section || !pin || !head) return;
      const value = reduceMotion ? 1 : measure(section, pin, head);
      if (value === null) return;
      progress.set(value);
      setSnapshot((previous) => {
        const next = journeySnapshot(value);
        return next.key === previous.key ? previous : next;
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      document.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduceMotion, progress, sectionRef, pinRef, headRef]);

  return { progress, snapshot };
}
