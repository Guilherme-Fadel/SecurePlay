import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import type { BrandCharacterExpression } from '@/components/shared/BrandCharacter';
import { journeyScrollRange } from './useJourneyProgress';

/**
 * O mascote amarelo acompanha a rolagem da landing: some do hero e surge no início
 * da trilha, percorre a jornada, some e surge no canto do card de jogos e, por
 * fim, no lugar do mascote de "Dê o play".
 *
 * Cada parada é um elemento real da página (`data-traveler`), que continua no
 * layout como âncora e fica invisível enquanto o viajante existe. Assim as
 * posições acompanham qualquer breakpoint sem números fixos. Com movimento
 * reduzido o viajante não é montado e as âncoras aparecem como antes.
 */

type Stop = 'hero' | 'journey' | 'missions' | 'play';

interface Box { x: number; y: number; w: number; rot: number; scale: number; opacity: number }

const ROTATION: Record<Stop, number> = { hero: 9, journey: 0, missions: -12, play: 0 };
const EXPRESSION: Record<Stop, BrandCharacterExpression> = { hero: 'open', journey: 'open', missions: 'happy', play: 'happy' };

function box(stop: Stop): Box | null {
  const el = document.querySelector<HTMLElement>(`[data-traveler="${stop}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width) return null;
  return { x: r.left, y: r.top, w: r.width, rot: ROTATION[stop], scale: 1, opacity: 1 };
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * Troca de parada: na primeira metade ele encolhe e some na origem; na segunda,
 * surge no destino crescendo com um leve giro (efeito "pop").
 */
function between(a: Box, b: Box, t: number): Box {
  const p = clamp01(t);
  if (p < 0.5) {
    const k = 1 - ease(p / 0.5);
    return { ...a, scale: k, opacity: k, rot: a.rot - (1 - k) * 25 };
  }
  const k = ease((p - 0.5) / 0.5);
  const pop = k + Math.sin(Math.PI * k) * 0.12;
  return { ...b, scale: pop, opacity: k, rot: b.rot + (1 - k) * 25 };
}

/** Posição de rolagem (scrollY) em que o centro da âncora fica na altura `at` da tela. */
function dockScroll(stop: Stop, at: number): number | null {
  const el = document.querySelector<HTMLElement>(`[data-traveler="${stop}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return window.scrollY + r.top + r.height / 2 - window.innerHeight * at;
}

type Frame = { box: Box; stop: Stop };

/**
 * Hero → trilha. O hero sai da tela cedo: some nos primeiros 30% de tela rolados
 * (ainda à vista), fica invisível no caminho e só surge perto do início da trilha.
 */
function heroToJourney(hero: Box, journey: Box, scroll: { y: number; from: number; vh: number }): Frame {
  const { y, from, vh } = scroll;
  const out = Math.min(vh * 0.3, from * 0.45);
  const back = Math.max(from - vh * 0.35, out);
  if (y <= out) return { box: between(hero, journey, out > 0 ? (y / out) * 0.5 : 0.5), stop: 'hero' };
  if (y < back) return { box: { ...journey, scale: 0, opacity: 0 }, stop: 'journey' };
  const t = from > back ? 0.5 + ((y - back) / (from - back)) * 0.5 : 1;
  return { box: between(hero, journey, t), stop: 'journey' };
}

/** Troca simétrica entre duas paradas ao longo de [start, end] da rolagem. */
function swap(from: [Box, Stop], to: [Box, Stop], scroll: { y: number; start: number; end: number }): Frame {
  const t = (scroll.y - scroll.start) / (scroll.end - scroll.start);
  return { box: between(from[0], to[0], t), stop: t < 0.5 ? from[1] : to[1] };
}

function frame(): Frame | null {
  const hero = box('hero');
  const journey = box('journey');
  const missions = box('missions');
  const play = box('play');
  const range = journeyScrollRange();
  if (!hero || !journey || !missions || !play || !range) return null;

  const y = window.scrollY;
  const vh = window.innerHeight;
  const toMissions = Math.max(dockScroll('missions', 0.72) ?? range.to, range.to + vh * 0.4);
  const toPlay = Math.max(dockScroll('play', 0.5) ?? toMissions, toMissions + vh * 0.4);

  if (y <= range.from) return heroToJourney(hero, journey, { y, from: range.from, vh });
  if (y <= range.to) return { box: journey, stop: 'journey' };
  if (y <= toMissions) return swap([journey, 'journey'], [missions, 'missions'], { y, start: range.to, end: toMissions });
  if (y <= toPlay) return swap([missions, 'missions'], [play, 'play'], { y, start: toMissions, end: toPlay });
  return { box: play, stop: 'play' };
}

export function LandingTraveler() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [stop, setStop] = useState<Stop>('hero');

  useEffect(() => {
    if (reduceMotion) return undefined;
    const root = document.querySelector('.landing');
    root?.classList.add('lp-has-traveler');
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      const next = frame();
      if (el) {
        if (next) {
          const { x, y, w, rot, scale, opacity } = next.box;
          el.style.opacity = String(opacity);
          el.style.width = `${w}px`;
          el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${scale})`;
          setStop((current) => (current === next.stop ? current : next.stop));
        } else {
          el.style.opacity = '0';
        }
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      root?.classList.remove('lp-has-traveler');
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;
  return (
    <div ref={ref} className="lp-traveler" aria-hidden="true">
      <BrandCharacter
        body="var(--sp-yellow)"
        face="var(--sp-black)"
        eyes="var(--sp-yellow)"
        expression={EXPRESSION[stop]}
        look={stop === 'hero' ? 3.5 : 0}
        blink
      />
    </div>
  );
}
